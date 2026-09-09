import "server-only";
import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { env } from "@/config/env";
import type { BriefingAnswers } from "@/features/briefing/questions";
import { getDb, type Db } from "@/server/db";
import {
  briefingRevisions,
  generationJobs,
  generationSteps,
  pages,
  pageVersions,
  projects,
} from "@/server/db/schema";
import { AnthropicGenerationProvider } from "./anthropic-provider";
import { validatePageDocument, type PageDocument } from "./page-document";
import { GenerationError, type GenerationProvider } from "./provider";
import { generatePageDocument, RULES_ENGINE_VERSION } from "./rules-engine";

/**
 * Pipeline persistente (spec §8.1): cada etapa registra input hash, duração,
 * tentativas, output tipado e erro sanitizado em `generation_steps`.
 * Reexecução reutiliza etapas válidas; o lock da fila impede conclusão dupla.
 */

class RulesProvider implements GenerationProvider {
  readonly kind = "rules" as const;
  readonly version = RULES_ENGINE_VERSION;
  async generate(input: {
    briefingRevisionId: string;
    answersHash: string;
    answers: BriefingAnswers;
  }) {
    return {
      document: generatePageDocument(input),
      usage: {},
    };
  }
}

export function selectGenerationProvider(): GenerationProvider {
  if (env().capabilities.llmGeneration) {
    return new AnthropicGenerationProvider();
  }
  return new RulesProvider();
}

export function selectedEngineKind(): "rules" | "anthropic" {
  return env().capabilities.llmGeneration ? "anthropic" : "rules";
}

async function runStep<T>(
  db: Db,
  jobId: string,
  step: string,
  inputHash: string,
  fn: () => Promise<T>,
): Promise<T> {
  const existing = await db.query.generationSteps.findFirst({
    where: and(
      eq(generationSteps.generationJobId, jobId),
      eq(generationSteps.step, step),
    ),
  });
  if (
    existing &&
    existing.status === "completed" &&
    existing.inputHash === inputHash &&
    existing.output != null
  ) {
    return (existing.output as { value: T }).value;
  }

  const started = Date.now();
  const base = {
    generationJobId: jobId,
    step,
    inputHash,
    status: "running" as const,
    attempt: (existing?.attempt ?? 0) + 1,
    startedAt: new Date(),
  };
  if (existing) {
    await db
      .update(generationSteps)
      .set({ ...base, error: null })
      .where(eq(generationSteps.id, existing.id));
  } else {
    await db.insert(generationSteps).values(base);
  }

  await db
    .update(generationJobs)
    .set({ currentStep: step })
    .where(eq(generationJobs.id, jobId));

  try {
    const value = await fn();
    await db
      .update(generationSteps)
      .set({
        status: "completed",
        output: { value } as Record<string, unknown>,
        durationMs: Date.now() - started,
        completedAt: new Date(),
      })
      .where(
        and(
          eq(generationSteps.generationJobId, jobId),
          eq(generationSteps.step, step),
        ),
      );
    return value;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db
      .update(generationSteps)
      .set({
        status: "failed",
        error: message.slice(0, 2000),
        durationMs: Date.now() - started,
        completedAt: new Date(),
      })
      .where(
        and(
          eq(generationSteps.generationJobId, jobId),
          eq(generationSteps.step, step),
        ),
      );
    throw err;
  }
}

export function hashAnswers(answers: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(answers))
    .digest("hex")
    .slice(0, 32);
}

/** Handler do job "generate_page" — idempotente por generationJobId. */
export async function processGenerationJob(payload: Record<string, unknown>): Promise<void> {
  const generationJobId = String(payload.generationJobId ?? "");
  if (!generationJobId) throw new Error("payload.generationJobId ausente");

  const db = await getDb();
  const job = await db.query.generationJobs.findFirst({
    where: eq(generationJobs.id, generationJobId),
  });
  if (!job) throw new Error(`generation_job ${generationJobId} não existe`);
  if (job.status === "completed" || job.status === "canceled") return;

  const revision = await db.query.briefingRevisions.findFirst({
    where: eq(briefingRevisions.id, job.briefingRevisionId),
  });
  if (!revision) throw new Error("Revisão do briefing não encontrada.");

  await db
    .update(generationJobs)
    .set({ status: "running", startedAt: job.startedAt ?? new Date() })
    .where(eq(generationJobs.id, job.id));

  const answers = revision.answers as BriefingAnswers;
  const inputHash = revision.answersHash;

  try {
    // 1. validar briefing (estrutura mínima para o motor)
    await runStep(db, job.id, "validate_briefing", inputHash, async () => {
      if (!answers || typeof answers !== "object") {
        throw new GenerationError(
          "invalid_output",
          "Briefing sem respostas válidas.",
          false,
        );
      }
      return { fields: Object.keys(answers).length };
    });

    // 2. gerar documento (estratégia + seleção + conteúdo + tokens)
    const document = await runStep(db, job.id, "generate_document", inputHash, async () => {
      const provider = selectGenerationProvider();
      const out = await provider.generate({
        briefingRevisionId: revision.id,
        answersHash: revision.answersHash,
        answers,
      });
      return out.document;
    });

    // 3. validar documento contra o schema do renderer
    const validated = await runStep(db, job.id, "validate_document", inputHash, async () => {
      const result = validatePageDocument(document);
      if (!result.ok) {
        throw new GenerationError(
          "invalid_output",
          `PageDocument inválido: ${result.issues.slice(0, 5).join("; ")}`,
          false,
        );
      }
      return result.document;
    });

    // 4. criar versão de página (reutiliza se este job já criou uma)
    const versionId = await runStep(db, job.id, "create_version", inputHash, async () =>
      createVersionForJob(db, job.projectId, job.workspaceId, job.id, validated),
    );

    await db
      .update(generationJobs)
      .set({
        status: "completed",
        currentStep: null,
        resultPageVersionId: versionId,
        completedAt: new Date(),
      })
      .where(eq(generationJobs.id, job.id));
  } catch (err) {
    const transient = err instanceof GenerationError ? err.transient : true;
    const message = err instanceof Error ? err.message : String(err);
    await db
      .update(generationJobs)
      .set({
        status: transient ? "queued" : "failed",
        error: message.slice(0, 2000),
        ...(transient ? {} : { completedAt: new Date() }),
      })
      .where(eq(generationJobs.id, job.id));
    // Repropaga: a fila decide retry (transitório) ou dead-letter.
    throw err;
  }
}

async function createVersionForJob(
  db: Db,
  projectId: string,
  workspaceId: string,
  generationJobId: string,
  document: PageDocument,
): Promise<string> {
  return await db.transaction(async (tx) => {
    const existing = await tx.query.pageVersions.findFirst({
      where: eq(pageVersions.generationJobId, generationJobId),
    });
    if (existing) return existing.id;

    const project = await tx.query.projects.findFirst({
      where: eq(projects.id, projectId),
    });
    if (!project) throw new Error("Projeto não encontrado.");

    let page = await tx.query.pages.findFirst({
      where: eq(pages.projectId, projectId),
    });
    if (!page) {
      const [created] = await tx
        .insert(pages)
        .values({
          projectId,
          workspaceId,
          name: document.businessName,
          status: "draft",
        })
        .returning();
      page = created;
    }

    const latest = await tx.query.pageVersions.findMany({
      where: eq(pageVersions.pageId, page.id),
      columns: { version: true },
    });
    const nextVersion =
      latest.reduce((max, v) => Math.max(max, v.version), 0) + 1;

    const [version] = await tx
      .insert(pageVersions)
      .values({
        pageId: page.id,
        workspaceId,
        version: nextVersion,
        document: document as unknown as Record<string, unknown>,
        source: "generation",
        generationJobId,
      })
      .returning();

    await tx
      .update(pages)
      .set({
        currentVersionId: version.id,
        status: page.status === "live" ? "live" : "ready",
        updatedAt: new Date(),
      })
      .where(eq(pages.id, page.id));

    return version.id;
  });
}
