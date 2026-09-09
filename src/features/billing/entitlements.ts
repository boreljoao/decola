import "server-only";
import { and, desc, eq, isNull, or, gt } from "drizzle-orm";
import { PLANS, type PlanDef, type PlanId } from "@/config/commercial-policy";
import { getDb } from "@/server/db";
import { entitlementGrants, pages } from "@/server/db/schema";

/**
 * Resolução de direitos por workspace (spec §3.2).
 * Um workspace pode ter mais de um grant ativo (ex.: assinatura + licença
 * vitalícia). Vale o plano de maior alcance entre os grants válidos.
 */

const PLAN_RANK: Record<PlanId, number> = {
  free: 0,
  vitalicio: 1,
  start: 2,
  pro: 3,
  business: 4,
  agencia: 5,
};

export interface WorkspaceEntitlement {
  plan: PlanDef;
  /** Grants válidos hoje — usado para explicar a origem do direito na UI. */
  activePlanIds: PlanId[];
  /** Quando o direito pago termina (null = sem prazo ou plano Free). */
  currentPeriodEndsAt: Date | null;
}

export async function getWorkspaceEntitlement(
  workspaceId: string,
): Promise<WorkspaceEntitlement> {
  const db = await getDb();
  const now = new Date();

  const grants = await db.query.entitlementGrants.findMany({
    where: and(
      eq(entitlementGrants.workspaceId, workspaceId),
      isNull(entitlementGrants.revokedAt),
      or(
        isNull(entitlementGrants.endsAt),
        gt(entitlementGrants.endsAt, now),
      ),
    ),
    orderBy: [desc(entitlementGrants.startsAt)],
  });

  const valid = grants.filter((g) => g.startsAt <= now);
  if (valid.length === 0) {
    return {
      plan: PLANS.free,
      activePlanIds: ["free"],
      currentPeriodEndsAt: null,
    };
  }

  const planIds = valid
    .map((g) => g.planId as PlanId)
    .filter((id): id is PlanId => id in PLANS);

  const best = planIds.reduce<PlanId>(
    (acc, id) => (PLAN_RANK[id] > PLAN_RANK[acc] ? id : acc),
    "free",
  );

  const bestGrant = valid.find((g) => g.planId === best);

  return {
    plan: PLANS[best],
    activePlanIds: planIds,
    currentPeriodEndsAt: bestGrant?.endsAt ?? null,
  };
}

export async function getWorkspacePlan(workspaceId: string): Promise<PlanDef> {
  return (await getWorkspaceEntitlement(workspaceId)).plan;
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

/**
 * Páginas que seriam pausadas ao cair para um plano menor — mostrado ANTES do
 * downgrade (spec §3.2), nunca como surpresa depois.
 */
export async function pagesAffectedByDowngrade(
  workspaceId: string,
  targetPlanId: PlanId,
): Promise<{ keptCount: number; pausedNames: string[] }> {
  const db = await getDb();
  const target = PLANS[targetPlanId];
  const live = await db.query.pages.findMany({
    where: and(eq(pages.workspaceId, workspaceId), eq(pages.status, "live")),
    columns: { name: true, updatedAt: true },
    orderBy: [desc(pages.updatedAt)],
  });

  if (target.entitlements.maxPublishedPages === "unlimited_commercial") {
    return { keptCount: live.length, pausedNames: [] };
  }
  const keep = target.entitlements.maxPublishedPages;
  return {
    keptCount: Math.min(keep, live.length),
    pausedNames: live.slice(keep).map((p) => p.name),
  };
}
