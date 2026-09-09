"use server";

import { eq } from "drizzle-orm";
import { after } from "next/server";
import { env } from "@/config/env";
import { getWorkspacePlan } from "@/features/billing/entitlements";
import { requireWorkspace, assertRole } from "@/server/auth";
import { getDb } from "@/server/db";
import { creativeSets, pages } from "@/server/db/schema";
import { enqueueJob, kickDrain } from "@/server/jobs";
import { registerAllJobHandlers } from "@/server/jobs/handlers";

/**
 * Solicitação de criativos (spec §10): respeita a franquia do plano.
 * Free tem franquia 0 — em produção a geração fica bloqueada com motivo e
 * caminho de upgrade; em desenvolvimento é liberada com identificação de
 * franquia de teste (spec §20: simuladores só em modo identificado).
 */

export interface RequestCreativesResult {
  ok: boolean;
  setId?: string;
  error?: string;
}

export async function requestCreativesAction(
  pageId: string,
): Promise<RequestCreativesResult> {
  try {
    const db = await getDb();
    const page = await db.query.pages.findFirst({ where: eq(pages.id, pageId) });
    if (!page) return { ok: false, error: "Página não encontrada." };
    const ctx = await requireWorkspace(page.workspaceId);
    assertRole(ctx, "editor");

    if (!page.currentVersionId) {
      return { ok: false, error: "Gere a página antes de criar os criativos." };
    }

    const plan = await getWorkspacePlan(page.workspaceId);
    const franchise = plan.entitlements.creativesPerMonth.value;
    const devMode = env().mode !== "production";
    if (franchise <= 0 && !devMode) {
      return {
        ok: false,
        error:
          `O plano ${plan.name} não inclui criativos. O plano Start inclui 2 criativos/mês.`,
      };
    }

    const [set] = await db
      .insert(creativeSets)
      .values({
        workspaceId: page.workspaceId,
        pageId: page.id,
        pageVersionId: page.currentVersionId,
        status: "queued",
        createdBy: ctx.user.profileId,
      })
      .returning({ id: creativeSets.id });

    registerAllJobHandlers();
    await enqueueJob({
      type: "generate_creatives",
      payload: { setId: set.id },
      dedupKey: `creatives:${set.id}`,
    });
    after(() => kickDrain());

    return { ok: true, setId: set.id };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Falha ao solicitar criativos.",
    };
  }
}
