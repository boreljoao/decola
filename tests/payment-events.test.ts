import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { applyPaymentEvent, type OfferSnapshot } from "@/features/billing/apply-event";
import { getBalance } from "@/features/billing/credits";
import {
  canPublishPage,
  getWorkspaceEntitlement,
} from "@/features/billing/entitlements";
import type { NormalizedPaymentEvent } from "@/features/billing/payment-provider";
import { CATALOG_VERSION } from "@/config/commercial-policy";
import { entitlementGrants, orders, payments } from "@/server/db/schema";
import { seedWorkspace, setupTestDb } from "./helpers/test-db";

/**
 * Invariantes de pagamento (spec §19.1, itens 2 e 10):
 * webhook repetido/fora de ordem não duplica crédito ou direito;
 * reembolso recalcula direitos sem apagar conteúdo.
 */

let ctx: Awaited<ReturnType<typeof setupTestDb>>;
let workspaceId: string;
let profileId: string;

const snapshot: OfferSnapshot = {
  planId: "start",
  periodMonths: 1,
  credits: 100,
  label: "Start mensal",
};

beforeEach(async () => {
  ctx = await setupTestDb();
  const seeded = await seedWorkspace(ctx.db);
  workspaceId = seeded.workspace.id;
  profileId = seeded.profile.id;
});

afterEach(async () => {
  await ctx.close();
});

async function createOrder(key = "intent-1") {
  const [order] = await ctx.db
    .insert(orders)
    .values({
      workspaceId,
      offerSnapshot: snapshot as unknown as Record<string, unknown>,
      catalogVersion: CATALOG_VERSION,
      amountCents: 4900,
      provider: "stripe",
      idempotencyKey: key,
      status: "awaiting_payment",
      createdBy: profileId,
    })
    .returning();
  return order;
}

function paidEvent(
  orderId: string,
  overrides: Partial<NormalizedPaymentEvent> = {},
): NormalizedPaymentEvent {
  return {
    provider: "stripe",
    eventId: "evt_1",
    eventType: "checkout.session.completed",
    providerPaymentId: "pi_1",
    orderId,
    status: "paid",
    amountCents: 4900,
    method: "card",
    ...overrides,
  };
}

describe("aplicação de eventos de pagamento", () => {
  it("pagamento aprovado concede plano e créditos", async () => {
    const order = await createOrder();
    const result = await applyPaymentEvent(paidEvent(order.id));

    expect(result).toMatchObject({ applied: true, grantedEntitlement: true });

    const entitlement = await getWorkspaceEntitlement(workspaceId);
    expect(entitlement.plan.id).toBe("start");
    expect(entitlement.currentPeriodEndsAt).toBeInstanceOf(Date);
    expect((await getBalance(workspaceId)).available).toBe(100);
  });

  it("WEBHOOK REPETIDO não duplica direito nem crédito", async () => {
    const order = await createOrder();
    const first = await applyPaymentEvent(paidEvent(order.id));
    const replay = await applyPaymentEvent(paidEvent(order.id));

    expect(first).toMatchObject({ grantedEntitlement: true });
    expect(replay).toMatchObject({ alreadyProcessed: true });

    const grants = await ctx.db.query.entitlementGrants.findMany({
      where: eq(entitlementGrants.workspaceId, workspaceId),
    });
    expect(grants).toHaveLength(1);
    expect((await getBalance(workspaceId)).granted).toBe(100);
  });

  it("eventos DIFERENTES para o mesmo pedido concedem o direito uma só vez", async () => {
    const order = await createOrder();
    await applyPaymentEvent(paidEvent(order.id, { eventId: "evt_a" }));
    const second = await applyPaymentEvent(
      paidEvent(order.id, { eventId: "evt_b", providerPaymentId: "pi_2" }),
    );

    expect(second.applied).toBe(true);
    if (second.applied) expect(second.grantedEntitlement).toBe(false);

    const grants = await ctx.db.query.entitlementGrants.findMany({
      where: eq(entitlementGrants.workspaceId, workspaceId),
    });
    expect(grants).toHaveLength(1);
  });

  it("evento fora de ordem não rebaixa um pedido já pago", async () => {
    const order = await createOrder();
    await applyPaymentEvent(paidEvent(order.id, { eventId: "evt_pago" }));
    await applyPaymentEvent(
      paidEvent(order.id, {
        eventId: "evt_atrasado",
        status: "pending",
        providerPaymentId: "pi_late",
      }),
    );

    const updated = await ctx.db.query.orders.findFirst({
      where: eq(orders.id, order.id),
    });
    expect(updated?.status).toBe("paid");
    expect((await getWorkspaceEntitlement(workspaceId)).plan.id).toBe("start");
  });

  it("retorno de checkout forjado não ativa plano (sem evento, sem direito)", async () => {
    await createOrder();
    // Nenhum evento aplicado: apenas "voltar da tela de sucesso" não concede.
    const entitlement = await getWorkspaceEntitlement(workspaceId);
    expect(entitlement.plan.id).toBe("free");
    expect((await getBalance(workspaceId)).available).toBe(0);
  });

  it("evento sem pedido conhecido é registrado e não concede nada", async () => {
    const result = await applyPaymentEvent(
      paidEvent("00000000-0000-4000-8000-000000000999", { eventId: "evt_orfao" }),
    );
    expect(result.applied).toBe(false);
    const grants = await ctx.db.query.entitlementGrants.findMany({
      where: eq(entitlementGrants.workspaceId, workspaceId),
    });
    expect(grants).toHaveLength(0);
  });
});

describe("reembolso e direitos", () => {
  it("reembolso revoga o direito e volta ao Free, sem apagar conteúdo", async () => {
    const order = await createOrder();
    await applyPaymentEvent(paidEvent(order.id));
    expect((await getWorkspaceEntitlement(workspaceId)).plan.id).toBe("start");

    await applyPaymentEvent(
      paidEvent(order.id, {
        eventId: "evt_refund",
        eventType: "charge.refunded",
        status: "refunded",
        refundedCents: 4900,
      }),
    );

    const entitlement = await getWorkspaceEntitlement(workspaceId);
    expect(entitlement.plan.id).toBe("free");

    // O registro financeiro é preservado (ledger/histórico não some).
    const grants = await ctx.db.query.entitlementGrants.findMany({
      where: eq(entitlementGrants.workspaceId, workspaceId),
    });
    expect(grants).toHaveLength(1);
    expect(grants[0].revokedAt).toBeInstanceOf(Date);

    const paymentRows = await ctx.db.query.payments.findMany({
      where: eq(payments.orderId, order.id),
    });
    expect(paymentRows[0].status).toBe("refunded");
  });

  it("limite de páginas segue o plano vigente", async () => {
    const order = await createOrder();
    await applyPaymentEvent(paidEvent(order.id));
    const eligibility = await canPublishPage(workspaceId, "página-nova");
    expect(eligibility.ok).toBe(true);
    if (eligibility.ok) {
      // Start remove a marca Decola do rodapé.
      expect(eligibility.showBadge).toBe(false);
    }
  });
});
