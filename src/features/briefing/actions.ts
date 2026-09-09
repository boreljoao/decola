"use server";

import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { selectedEngineKind } from "@/features/generation/pipeline";
import { requireWorkspace, assertRole } from "@/server/auth";
import { getDb } from "@/server/db";
import {
  briefingRevisions,
  briefings,
  generationJobs,
  projects,
} from "@/server/db/schema";
import { enqueueJob, kickDrain } from "@/server/jobs";
import { registerAllJobHandlers } from "@/server/jobs/handlers";
import {
  QUESTIONS,
  validateForCompletion,
  type BriefingAnswers,
} from "./questions";

/** Carrega projeto + briefing garantindo fronteira de workspace (spec §4). */
async function loadProjectAuthorized(projectId: string) {
  const db = await getDb();
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });
  if (!project) throw new Error("Projeto não encontrado.");
  const ctx = await requireWorkspace(project.workspaceId);
  assertRole(ctx, "editor");
  const briefing = await db.query.briefings.findFirst({
    where: eq(briefings.projectId, projectId),
  });
  if (!briefing) throw new Error("Briefing não encontrado.");
  return { db, project, briefing, ctx };
}

const answersPayload = z.record(
  z.string().max(80),
  z.object({
    value: z.unknown(),
    origin: z.enum(["user", "transcribed", "inferred"]),
  }),
);

export interface SaveResult {
  ok: boolean;
  savedAt?: string;
  error?: string;
}

/**
 * Autosave do briefing (spec §7.1): grava o estado corrente no registro do
 * briefing sem criar revisão — revisões imutáveis nascem na conclusão.
 */
export async function saveBriefingAnswers(
  projectId: string,
  rawAnswers: unknown,
): Promise<SaveResult> {
  try {
    const parsed = answersPayload.safeParse(rawAnswers);
    if (!parsed.success) {
      return { ok: false, error: "Formato de respostas inválido." };
    }
    // Aceita somente ids de perguntas conhecidas (anti mass-assignment).
    const known = new Set(QUESTIONS.map((q) => q.id));
    const answers: BriefingAnswers = {};
    for (const [k, v] of Object.entries(parsed.data)) {
      if (known.has(k)) answers[k] = v as BriefingAnswers[string];
    }

    const { db, briefing } = await loadProjectAuthorized(projectId);
    await db
      .update(briefings)
      .set({
        // rascunho corrente vive em uma revisão "0" mutável, separada das imutáveis
        updatedAt: new Date(),
      })
      .where(eq(briefings.id, briefing.id));

    const draft = await db.query.briefingRevisions.findFirst({
      where: and(
        eq(briefingRevisions.briefingId, briefing.id),
        eq(briefingRevisions.revision, 0),
      ),
    });
    const hash = createHash("sha256")
      .update(JSON.stringify(answers))
      .digest("hex")
      .slice(0, 32);
    if (draft) {
      await db
        .update(briefingRevisions)
        .set({ answers, answersHash: hash, createdAt: new Date() })
        .where(eq(briefingRevisions.id, draft.id));
    } else {
      await db.insert(briefingRevisions).values({
        briefingId: briefing.id,
        workspaceId: briefing.workspaceId,
        revision: 0,
        answers,
        answersHash: hash,
      });
    }
    return { ok: true, savedAt: new Date().toISOString() };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Falha ao salvar.",
    };
  }
}

export interface FinishResult {
  ok: boolean;
  error?: string;
  missing?: string[];
  invalid?: Array<{ id: string; message: string }>;
}

/**
 * Conclui o briefing: valida, cria revisão imutável e inicia (ou reaproveita)
 * o job de geração ligado à revisão (spec §7.3 — jobs por revisão + hash).
 */
export async function finishBriefingAndGenerate(
  projectId: string,
  rawAnswers: unknown,
): Promise<FinishResult> {
  const parsed = answersPayload.safeParse(rawAnswers);
  if (!parsed.success) return { ok: false, error: "Formato inválido." };

  const known = new Set(QUESTIONS.map((q) => q.id));
  const answers: BriefingAnswers = {};
  for (const [k, v] of Object.entries(parsed.data)) {
    if (known.has(k)) answers[k] = v as BriefingAnswers[string];
  }

  const { db, briefing } = await loadProjectAuthorized(projectId);

  const validation = validateForCompletion(briefing.mode, answers);
  if (!validation.ok) {
    return {
      ok: false,
      missing: validation.missing,
      invalid: validation.invalid,
      error: "Responda as perguntas obrigatórias antes de gerar.",
    };
  }

  const hash = createHash("sha256")
    .update(JSON.stringify(validation.cleaned))
    .digest("hex")
    .slice(0, 32);

  // Reutiliza a revisão se as respostas não mudaram (não duplica recursos).
  const currentRevisions = await db.query.briefingRevisions.findMany({
    where: eq(briefingRevisions.briefingId, briefing.id),
  });
  const same = currentRevisions.find(
    (r) => r.revision > 0 && r.answersHash === hash,
  );

  let revisionId: string;
  if (same) {
    revisionId = same.id;
  } else {
    const nextRev =
      currentRevisions.reduce((m, r) => Math.max(m, r.revision), 0) + 1;
    const [rev] = await db
      .insert(briefingRevisions)
      .values({
        briefingId: briefing.id,
        workspaceId: briefing.workspaceId,
        revision: nextRev,
        answers: validation.cleaned,
        answersHash: hash,
      })
      .returning({ id: briefingRevisions.id });
    revisionId = rev.id;
    await db
      .update(briefings)
      .set({ status: "completed", currentRevision: nextRev, updatedAt: new Date() })
      .where(eq(briefings.id, briefing.id));
  }

  // Um generation_job por revisão (unique index garante).
  let job = await db.query.generationJobs.findFirst({
    where: eq(generationJobs.briefingRevisionId, revisionId),
  });
  if (!job) {
    const [created] = await db
      .insert(generationJobs)
      .values({
        workspaceId: briefing.workspaceId,
        projectId,
        briefingRevisionId: revisionId,
        engine: selectedEngineKind(),
        status: "queued",
      })
      .onConflictDoNothing({ target: generationJobs.briefingRevisionId })
      .returning();
    job =
      created ??
      (await db.query.generationJobs.findFirst({
        where: eq(generationJobs.briefingRevisionId, revisionId),
      }))!;
  }

  registerAllJobHandlers();
  await enqueueJob({
    type: "generate_page",
    payload: { generationJobId: job.id },
    dedupKey: `generate_page:${job.id}`,
  });
  after(() => kickDrain());

  redirect(`/app/paginas/${projectId}/geracao`);
}
