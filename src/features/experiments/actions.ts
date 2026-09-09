"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { assertRole, requireWorkspace } from "@/server/auth";
import { getDb } from "@/server/db";
import {
  auditLog,
  experiments,
  experimentVariants,
  pages,
  pageVersions,
} from "@/server/db/schema";
import { evaluate, proposeHypothesis, startExperiment } from "./service";

/** Inicia o teste proposto (spec §13.2: aprovação manual é o padrão). */
export async function startExperimentAction(
  pageId: string,
): Promise<{ ok: boolean; error?: string }> {
  const db = await getDb();
  const page = await db.query.pages.findFirst({ where: eq(pages.id, pageId) });
  if (!page) return { ok: false, error: "Página não encontrada." };
  const ctx = await requireWorkspace(page.workspaceId);
  assertRole(ctx, "editor");

  const proposal = await proposeHypothesis(pageId);
  if (!proposal) {
    return {
      ok: false,
      error: "Não foi possível formular uma hipótese para esta página.",
    };
  }

  const result = await startExperiment({
    pageId,
    workspaceId: page.workspaceId,
    profileId: ctx.user.profileId,
    proposal,
  });

  if (result.ok) {
    await db.insert(auditLog).values({
      workspaceId: page.workspaceId,
      actorProfileId: ctx.user.profileId,
      action: "experiment.start",
      target: result.experimentId,
      meta: { hypothesis: proposal.hypothesis, change: proposal.change },
    });
    revalidatePath(`/app/paginas/${page.projectId}/experimentos`);
  }
  return { ok: result.ok, error: result.error };
}

/**
 * Encerra o teste. Adota a variante SOMENTE com vencedor estatístico; sem
 * vencedor, mantém o original e registra resultado inconclusivo.
 */
export async function concludeExperimentAction(
  experimentId: string,
): Promise<{ ok: boolean; outcome?: string; error?: string }> {
  const db = await getDb();
  const experiment = await db.query.experiments.findFirst({
    where: eq(experiments.id, experimentId),
  });
  if (!experiment) return { ok: false, error: "Teste não encontrado." };
  const ctx = await requireWorkspace(experiment.workspaceId);
  assertRole(ctx, "editor");

  const report = await evaluate(experimentId);
  if (!report) return { ok: false, error: "Não foi possível avaliar o teste." };

  if (report.verdict.kind === "awaiting_data") {
    return {
      ok: false,
      error: report.verdict.reason,
    };
  }

  const page = await db.query.pages.findFirst({
    where: eq(pages.id, experiment.pageId),
  });

  if (report.verdict.kind === "inconclusive") {
    await db
      .update(experiments)
      .set({
        status: "inconclusive",
        endedAt: new Date(),
        conclusion: report.verdict.reason,
      })
      .where(eq(experiments.id, experimentId));
    if (page) revalidatePath(`/app/paginas/${page.projectId}/experimentos`);
    return { ok: true, outcome: "inconclusive" };
  }

  // Vencedor: adota a variante publicando a versão dela; se o controle vence,
  // nada muda (a versão vigente já é o controle).
  // Estreitamento capturado fora do closure da transação.
  const winnerVerdict = report.verdict;
  const variants = await db.query.experimentVariants.findMany({
    where: eq(experimentVariants.experimentId, experimentId),
  });
  const winnerRole = winnerVerdict.winner;
  const winner = variants.find((v) => v.role === winnerRole);

  await db.transaction(async (tx) => {
    if (winner && winnerRole === "variant" && page) {
      const version = await tx.query.pageVersions.findFirst({
        where: eq(pageVersions.id, winner.pageVersionId),
      });
      if (version) {
        await tx
          .update(pages)
          .set({
            currentVersionId: version.id,
            publishedVersionId: version.id,
            updatedAt: new Date(),
          })
          .where(eq(pages.id, page.id));
      }
    }
    await tx
      .update(experiments)
      .set({
        status: "completed",
        endedAt: new Date(),
        winnerVariantId: winner?.id,
        conclusion:
          winnerRole === "variant"
            ? `A versão de teste converteu mais (${winnerVerdict.absoluteDiffPp > 0 ? "+" : ""}${winnerVerdict.absoluteDiffPp} pontos percentuais) e foi adotada.`
            : "A versão original converteu mais e foi mantida.",
      })
      .where(eq(experiments.id, experimentId));
  });

  await db.insert(auditLog).values({
    workspaceId: experiment.workspaceId,
    actorProfileId: ctx.user.profileId,
    action: "experiment.conclude",
    target: experimentId,
    meta: { winner: winnerRole, pValue: winnerVerdict.pValue },
  });

  if (page) revalidatePath(`/app/paginas/${page.projectId}/experimentos`);
  return { ok: true, outcome: winnerRole };
}

/** Reverte para o controle a qualquer momento (spec: sempre permitir rollback). */
export async function rollbackExperimentAction(
  experimentId: string,
): Promise<{ ok: boolean; error?: string }> {
  const db = await getDb();
  const experiment = await db.query.experiments.findFirst({
    where: eq(experiments.id, experimentId),
  });
  if (!experiment) return { ok: false, error: "Teste não encontrado." };
  const ctx = await requireWorkspace(experiment.workspaceId);
  assertRole(ctx, "editor");

  const variants = await db.query.experimentVariants.findMany({
    where: eq(experimentVariants.experimentId, experimentId),
  });
  const control = variants.find((v) => v.role === "control");
  const page = await db.query.pages.findFirst({
    where: eq(pages.id, experiment.pageId),
  });

  await db.transaction(async (tx) => {
    if (control && page) {
      await tx
        .update(pages)
        .set({
          currentVersionId: control.pageVersionId,
          publishedVersionId: control.pageVersionId,
          updatedAt: new Date(),
        })
        .where(eq(pages.id, page.id));
    }
    await tx
      .update(experiments)
      .set({
        status: "rolled_back",
        endedAt: new Date(),
        conclusion: "Teste revertido: a versão original voltou a ser exibida.",
      })
      .where(eq(experiments.id, experimentId));
  });

  if (page) revalidatePath(`/app/paginas/${page.projectId}/experimentos`);
  return { ok: true };
}
