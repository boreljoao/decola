import "server-only";
import { and, eq, sql } from "drizzle-orm";
import type { PlanId } from "@/config/commercial-policy";
import { getDb } from "@/server/db";
import {
  couponRedemptions,
  couponReservations,
  coupons,
  orders,
} from "@/server/db/schema";

/**
 * Cupons (spec §12.3).
 *
 * Invariantes:
 * - Reserva transacional com expiração impede ultrapassar o limite global
 *   por concorrência; o resgate só é confirmado após o pagamento.
 * - O desconto é calculado no SERVIDOR a partir do preço do catálogo — o
 *   cliente nunca envia preço nem desconto.
 * - Por padrão, reembolso NÃO restaura uma promoção de uso único.
 */

export const RESERVATION_TTL_MINUTES = 30;

export function normalizeCode(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, "");
}

export type CouponFailure =
  | "not_found"
  | "inactive"
  | "not_started"
  | "expired"
  | "exhausted"
  | "already_used"
  | "not_first_purchase"
  | "plan_not_eligible";

export const COUPON_MESSAGES: Record<CouponFailure, string> = {
  not_found: "Cupom não encontrado.",
  inactive: "Este cupom não está mais disponível.",
  not_started: "Este cupom ainda não começou a valer.",
  expired: "Este cupom expirou.",
  exhausted: "Este cupom atingiu o limite de usos.",
  already_used: "Este cupom já foi usado neste workspace.",
  not_first_purchase: "Este cupom vale apenas para a primeira compra.",
  plan_not_eligible: "Este cupom não vale para o plano escolhido.",
};

export interface DiscountResult {
  discountCents: number;
  finalCents: number;
  label: string;
}

/** Calcula o desconto sem nunca deixar o total negativo. */
export function computeDiscount(
  coupon: { kind: "percent" | "fixed"; value: number; code: string },
  amountCents: number,
): DiscountResult {
  const raw =
    coupon.kind === "percent"
      ? Math.round((amountCents * coupon.value) / 100)
      : coupon.value;
  const discountCents = Math.max(0, Math.min(raw, amountCents));
  return {
    discountCents,
    finalCents: amountCents - discountCents,
    label:
      coupon.kind === "percent"
        ? `${coupon.code} (−${coupon.value}%)`
        : `${coupon.code}`,
  };
}

export type ValidationResult =
  | { ok: true; couponId: string; discount: DiscountResult }
  | { ok: false; reason: CouponFailure; message: string };

type Db = Awaited<ReturnType<typeof getDb>>;
type Handle = Db | Parameters<Parameters<Db["transaction"]>[0]>[0];

/**
 * Validação sobre um handle explícito (conexão OU transação). Dentro de uma
 * transação é obrigatório reusar o `tx`: abrir outra conexão veria estado não
 * comprometido e, em conexão única, travaria.
 */
async function validateWithHandle(
  handle: Handle,
  input: {
    code: string;
    workspaceId: string;
    planId: PlanId;
    amountCents: number;
  },
): Promise<ValidationResult> {
  const code = normalizeCode(input.code);
  const fail = (reason: CouponFailure): ValidationResult => ({
    ok: false,
    reason,
    message: COUPON_MESSAGES[reason],
  });

  const [coupon] = await handle
    .select()
    .from(coupons)
    .where(eq(coupons.code, code))
    .limit(1);

  if (!coupon) return fail("not_found");
  if (!coupon.active) return fail("inactive");

  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) return fail("not_started");
  if (coupon.endsAt && coupon.endsAt <= now) return fail("expired");

  const planIds = (coupon.planIds as string[]) ?? [];
  if (planIds.length > 0 && !planIds.includes(input.planId)) {
    return fail("plan_not_eligible");
  }

  if (coupon.oncePerWorkspace) {
    const used = await handle
      .select({ id: couponRedemptions.id })
      .from(couponRedemptions)
      .where(
        and(
          eq(couponRedemptions.couponId, coupon.id),
          eq(couponRedemptions.workspaceId, input.workspaceId),
        ),
      )
      .limit(1);
    if (used.length > 0) return fail("already_used");
  }

  if (coupon.firstPurchaseOnly) {
    const paid = await handle
      .select({ id: orders.id })
      .from(orders)
      .where(
        and(eq(orders.workspaceId, input.workspaceId), eq(orders.status, "paid")),
      )
      .limit(1);
    if (paid.length > 0) return fail("not_first_purchase");
  }

  if (coupon.maxRedemptions != null) {
    const used = await countCommitted(handle, coupon.id);
    if (used >= coupon.maxRedemptions) return fail("exhausted");
  }

  return {
    ok: true,
    couponId: coupon.id,
    discount: computeDiscount(
      { kind: coupon.kind, value: coupon.value, code: coupon.code },
      input.amountCents,
    ),
  };
}

/** Valida sem reservar — usado para pré-visualizar o desconto na tela. */
export async function validateCoupon(input: {
  code: string;
  workspaceId: string;
  planId: PlanId;
  amountCents: number;
}): Promise<ValidationResult> {
  const db = await getDb();
  return validateWithHandle(db, input);
}

/** Resgates + reservas vivas: é o total que ocupa o limite global. */
async function countCommitted(
  handle: Handle,
  couponId: string,
): Promise<number> {
  const redeemed = await handle
    .select({ id: couponRedemptions.id })
    .from(couponRedemptions)
    .where(eq(couponRedemptions.couponId, couponId));

  const held = await handle
    .select({ expiresAt: couponReservations.expiresAt })
    .from(couponReservations)
    .where(
      and(
        eq(couponReservations.couponId, couponId),
        eq(couponReservations.status, "held"),
      ),
    );

  const now = new Date();
  return redeemed.length + held.filter((h) => h.expiresAt > now).length;
}

export type ReserveCouponResult =
  | { ok: true; couponId: string; discount: DiscountResult }
  | { ok: false; reason: CouponFailure; message: string };

/**
 * Reserva o cupom para um pedido. O advisory lock por cupom serializa
 * tentativas concorrentes: sem ele, duas compras simultâneas do último uso
 * passariam as duas.
 */
export async function reserveCoupon(input: {
  code: string;
  workspaceId: string;
  orderId: string;
  planId: PlanId;
  amountCents: number;
}): Promise<ReserveCouponResult> {
  const db = await getDb();

  return await db.transaction(async (tx) => {
    const code = normalizeCode(input.code);
    const [coupon] = await tx
      .select({ id: coupons.id })
      .from(coupons)
      .where(eq(coupons.code, code))
      .limit(1);
    if (!coupon) {
      return {
        ok: false,
        reason: "not_found" as const,
        message: COUPON_MESSAGES.not_found,
      };
    }

    // Serializa tentativas concorrentes deste cupom: sem o lock, duas compras
    // simultâneas do último uso passariam as duas.
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtext(${`coupon:${coupon.id}`}))`,
    );

    // Validação DENTRO da transação, com o mesmo handle: enxerga as reservas
    // criadas por transações já comprometidas e respeita o lock.
    const validation = await validateWithHandle(tx, {
      code,
      workspaceId: input.workspaceId,
      planId: input.planId,
      amountCents: input.amountCents,
    });
    if (!validation.ok) return validation;

    await tx
      .insert(couponReservations)
      .values({
        couponId: coupon.id,
        workspaceId: input.workspaceId,
        orderId: input.orderId,
        status: "held",
        expiresAt: new Date(Date.now() + RESERVATION_TTL_MINUTES * 60_000),
      })
      .onConflictDoUpdate({
        target: couponReservations.orderId,
        set: {
          couponId: coupon.id,
          status: "held",
          expiresAt: new Date(Date.now() + RESERVATION_TTL_MINUTES * 60_000),
        },
      });

    return {
      ok: true,
      couponId: coupon.id,
      discount: validation.discount,
    };
  });
}

/** Confirma o resgate após o pagamento. Idempotente por pedido. */
export async function redeemCoupon(input: {
  orderId: string;
  discountCents: number;
}): Promise<boolean> {
  const db = await getDb();
  return await db.transaction(async (tx) => {
    const reservation = await tx.query.couponReservations.findFirst({
      where: eq(couponReservations.orderId, input.orderId),
    });
    if (!reservation) return false;
    if (reservation.status === "redeemed") return true;

    await tx
      .insert(couponRedemptions)
      .values({
        couponId: reservation.couponId,
        workspaceId: reservation.workspaceId,
        orderId: input.orderId,
        discountCents: input.discountCents,
      })
      .onConflictDoNothing({ target: couponRedemptions.orderId });

    await tx
      .update(couponReservations)
      .set({ status: "redeemed" })
      .where(eq(couponReservations.id, reservation.id));
    return true;
  });
}

/** Libera a reserva quando o checkout falha ou expira. */
export async function releaseCoupon(orderId: string): Promise<void> {
  const db = await getDb();
  await db
    .update(couponReservations)
    .set({ status: "released" })
    .where(
      and(
        eq(couponReservations.orderId, orderId),
        eq(couponReservations.status, "held"),
      ),
    );
}
