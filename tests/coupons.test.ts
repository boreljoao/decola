import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import {
  computeDiscount,
  normalizeCode,
  redeemCoupon,
  releaseCoupon,
  reserveCoupon,
  validateCoupon,
} from "@/features/billing/coupons";
import { CATALOG_VERSION } from "@/config/commercial-policy";
import {
  couponRedemptions,
  couponReservations,
  coupons,
  orders,
} from "@/server/db/schema";
import { seedWorkspace, setupTestDb } from "./helpers/test-db";

/**
 * Invariante da spec §19.1 item 4: cupons concorrentes respeitam o limite;
 * expiração libera a reserva.
 */

let ctx: Awaited<ReturnType<typeof setupTestDb>>;
let workspaceId: string;
let profileId: string;

beforeEach(async () => {
  ctx = await setupTestDb();
  const seeded = await seedWorkspace(ctx.db);
  workspaceId = seeded.workspace.id;
  profileId = seeded.profile.id;
});

afterEach(async () => {
  await ctx.close();
});

async function createCoupon(overrides: Partial<typeof coupons.$inferInsert> = {}) {
  const [coupon] = await ctx.db
    .insert(coupons)
    .values({
      code: "DECOLA20",
      kind: "percent",
      value: 20,
      ...overrides,
    })
    .returning();
  return coupon;
}

async function createOrder(key: string) {
  const [order] = await ctx.db
    .insert(orders)
    .values({
      workspaceId,
      offerSnapshot: { planId: "start", periodMonths: 1, credits: 0, label: "Start" },
      catalogVersion: CATALOG_VERSION,
      amountCents: 4900,
      provider: "stripe",
      idempotencyKey: key,
      createdBy: profileId,
    })
    .returning();
  return order;
}

describe("cálculo de desconto", () => {
  it("percentual e valor fixo", () => {
    expect(
      computeDiscount({ kind: "percent", value: 20, code: "X" }, 4900),
    ).toMatchObject({ discountCents: 980, finalCents: 3920 });

    expect(
      computeDiscount({ kind: "fixed", value: 1000, code: "X" }, 4900),
    ).toMatchObject({ discountCents: 1000, finalCents: 3900 });
  });

  it("nunca deixa o total negativo", () => {
    const result = computeDiscount({ kind: "fixed", value: 99999, code: "X" }, 4900);
    expect(result.discountCents).toBe(4900);
    expect(result.finalCents).toBe(0);
  });

  it("normaliza o código digitado", () => {
    expect(normalizeCode("  decola 20 ")).toBe("DECOLA20");
  });
});

describe("validação de cupom", () => {
  it("aceita cupom válido e calcula o desconto no servidor", async () => {
    await createCoupon();
    const result = await validateCoupon({
      code: "decola20",
      workspaceId,
      planId: "start",
      amountCents: 4900,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.discount.discountCents).toBe(980);
  });

  it("recusa cupom inexistente, inativo, futuro e expirado", async () => {
    const inexistente = await validateCoupon({
      code: "NAOEXISTE",
      workspaceId,
      planId: "start",
      amountCents: 4900,
    });
    expect(inexistente.ok).toBe(false);

    await createCoupon({ code: "INATIVO", active: false });
    const inativo = await validateCoupon({
      code: "INATIVO",
      workspaceId,
      planId: "start",
      amountCents: 4900,
    });
    expect(inativo.ok).toBe(false);
    if (!inativo.ok) expect(inativo.reason).toBe("inactive");

    await createCoupon({
      code: "FUTURO",
      startsAt: new Date(Date.now() + 86_400_000),
    });
    const futuro = await validateCoupon({
      code: "FUTURO",
      workspaceId,
      planId: "start",
      amountCents: 4900,
    });
    if (!futuro.ok) expect(futuro.reason).toBe("not_started");

    await createCoupon({ code: "VENCIDO", endsAt: new Date(Date.now() - 1000) });
    const vencido = await validateCoupon({
      code: "VENCIDO",
      workspaceId,
      planId: "start",
      amountCents: 4900,
    });
    if (!vencido.ok) expect(vencido.reason).toBe("expired");
  });

  it("respeita escopo de plano", async () => {
    await createCoupon({ code: "SOPRO", planIds: ["pro"] });
    const naoElegivel = await validateCoupon({
      code: "SOPRO",
      workspaceId,
      planId: "start",
      amountCents: 4900,
    });
    expect(naoElegivel.ok).toBe(false);
    if (!naoElegivel.ok) expect(naoElegivel.reason).toBe("plan_not_eligible");

    const elegivel = await validateCoupon({
      code: "SOPRO",
      workspaceId,
      planId: "pro",
      amountCents: 12900,
    });
    expect(elegivel.ok).toBe(true);
  });
});

describe("limite e concorrência", () => {
  it("DOIS resgates concorrentes do último uso: só um passa", async () => {
    await createCoupon({ code: "ULTIMO", maxRedemptions: 1 });
    const pedidoA = await createOrder("order-a");
    const pedidoB = await createOrder("order-b");

    const [a, b] = await Promise.all([
      reserveCoupon({
        code: "ULTIMO",
        workspaceId,
        orderId: pedidoA.id,
        planId: "start",
        amountCents: 4900,
      }),
      reserveCoupon({
        code: "ULTIMO",
        workspaceId,
        orderId: pedidoB.id,
        planId: "start",
        amountCents: 4900,
      }),
    ]);

    const aceitos = [a, b].filter((r) => r.ok);
    const recusados = [a, b].filter((r) => !r.ok);
    expect(aceitos).toHaveLength(1);
    expect(recusados).toHaveLength(1);
    if (!recusados[0].ok) expect(recusados[0].reason).toBe("exhausted");
  });

  it("reserva expirada libera a vaga para outro pedido", async () => {
    const coupon = await createCoupon({ code: "LIMITE1", maxRedemptions: 1 });
    const pedidoA = await createOrder("order-exp-a");
    const pedidoB = await createOrder("order-exp-b");

    await reserveCoupon({
      code: "LIMITE1",
      workspaceId,
      orderId: pedidoA.id,
      planId: "start",
      amountCents: 4900,
    });

    // Vaga ocupada: o segundo pedido é recusado.
    const bloqueado = await validateCoupon({
      code: "LIMITE1",
      workspaceId: "00000000-0000-4000-8000-00000000bbbb",
      planId: "start",
      amountCents: 4900,
    });
    expect(bloqueado.ok).toBe(false);

    // A reserva vence sem pagamento.
    await ctx.db
      .update(couponReservations)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(couponReservations.couponId, coupon.id));

    const liberado = await reserveCoupon({
      code: "LIMITE1",
      workspaceId,
      orderId: pedidoB.id,
      planId: "start",
      amountCents: 4900,
    });
    expect(liberado.ok).toBe(true);
  });

  it("liberar a reserva devolve a vaga", async () => {
    await createCoupon({ code: "SOLTA", maxRedemptions: 1 });
    const pedido = await createOrder("order-solta");

    await reserveCoupon({
      code: "SOLTA",
      workspaceId,
      orderId: pedido.id,
      planId: "start",
      amountCents: 4900,
    });
    await releaseCoupon(pedido.id);

    const outro = await validateCoupon({
      code: "SOLTA",
      workspaceId: "00000000-0000-4000-8000-00000000cccc",
      planId: "start",
      amountCents: 4900,
    });
    expect(outro.ok).toBe(true);
  });
});

describe("resgate", () => {
  it("confirma o resgate após pagamento e é idempotente", async () => {
    await createCoupon({ code: "PAGO", maxRedemptions: 5 });
    const pedido = await createOrder("order-pago");

    await reserveCoupon({
      code: "PAGO",
      workspaceId,
      orderId: pedido.id,
      planId: "start",
      amountCents: 4900,
    });

    await redeemCoupon({ orderId: pedido.id, discountCents: 980 });
    await redeemCoupon({ orderId: pedido.id, discountCents: 980 });

    const resgates = await ctx.db.query.couponRedemptions.findMany({
      where: eq(couponRedemptions.orderId, pedido.id),
    });
    expect(resgates).toHaveLength(1);
    expect(resgates[0].discountCents).toBe(980);
  });

  it("cupom de uso único por workspace bloqueia a segunda compra", async () => {
    await createCoupon({ code: "UMAVEZ", oncePerWorkspace: true });
    const primeiro = await createOrder("order-1x-a");

    await reserveCoupon({
      code: "UMAVEZ",
      workspaceId,
      orderId: primeiro.id,
      planId: "start",
      amountCents: 4900,
    });
    await redeemCoupon({ orderId: primeiro.id, discountCents: 980 });

    const segunda = await validateCoupon({
      code: "UMAVEZ",
      workspaceId,
      planId: "start",
      amountCents: 4900,
    });
    expect(segunda.ok).toBe(false);
    if (!segunda.ok) expect(segunda.reason).toBe("already_used");
  });
});
