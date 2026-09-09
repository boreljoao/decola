import "server-only";
import { and, eq } from "drizzle-orm";
import { PLANS, type PlanDef } from "@/config/commercial-policy";
import { getDb } from "@/server/db";
import { pages } from "@/server/db/schema";

/**
 * Resolução de direitos por workspace. Enquanto o fluxo de receita (Fase D)
 * não concede grants pagos, todo workspace opera no plano Free — o mesmo
 * caminho de autorização que os planos pagos usarão.
 */

export async function getWorkspacePlan(workspaceId: string): Promise<PlanDef> {
  // Fase D substitui esta resolução por consulta a entitlement_grants ativos;
  // até lá, Free é o único plano concedível e nenhuma venda está habilitada.
  void workspaceId;
  return PLANS.free;
}

export type PublishEligibility =
  | { ok: true; showBadge: boolean }
  | { ok: false; reason: string };

export async function canPublishPage(
  workspaceId: string,
  pageId: string,
): Promise<PublishEligibility> {
  const plan = await getWorkspacePlan(workspaceId);
  const db = await getDb();

  if (plan.entitlements.maxPublishedPages !== "unlimited_commercial") {
    const livePages = await db.query.pages.findMany({
      where: and(eq(pages.workspaceId, workspaceId), eq(pages.status, "live")),
      columns: { id: true },
    });
    const othersLive = livePages.filter((p) => p.id !== pageId).length;
    if (othersLive >= plan.entitlements.maxPublishedPages) {
      return {
        ok: false,
        reason:
          `Seu plano ${plan.name} permite ${plan.entitlements.maxPublishedPages} página(s) publicada(s). ` +
          "Despublique uma página ou faça upgrade para publicar esta.",
      };
    }
  }

  return { ok: true, showBadge: plan.entitlements.showDecolaBadge };
}
