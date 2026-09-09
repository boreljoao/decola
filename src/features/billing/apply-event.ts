import "server-only";
import { eq } from "drizzle-orm";
import { PLANS, type PlanId } from "@/config/commercial-policy";
import { getDb } from "@/server/db";
import {
  entitlementGrants,
  orders,
  payments,
  webhookInbox,
} from "@/server/db/schema";
import { redeemCoupon, releaseCoupon } from "./coupons";
import { grantCredits } from "./credits";
import type { NormalizedPaymentEvent } from "./payment-provider";

/**
 * Aplicação de evento de pagamento (spec §12.1).
 *
 * Dois controles DISTINTOS, ambos necessários:
 * 1. `webhook_inbox (provider, event_id)` único — a mesma reentrega não é
 *    processada duas vezes.
 * 2. `entitlement_grants.order_id` único — mesmo que dois eventos diferentes
 *    falem do mesmo pedido, o direito é concedido uma única vez.
 *
 * Eventos fora de ordem são tolerados: um evento antigo nunca rebaixa um
 * pedido já pago.
 */

export interface OfferSnapshot {
  planId: PlanId;
  periodMonths: number;
  /** Créditos combinados no momento da compra (snapshot da política). */
  credits: number;
  label: string;
}

export type ApplyResult =
  | { applied: true; alreadyProcessed: boolean; grantedEntitlement: boolean }
  | { applied: false; reason: string };

export async function applyPaymentEvent(
  event: NormalizedPaymentEvent,
): Promise<ApplyResult> {
  const db = await getDb();

  // 1. Inbox: registra o evento; conflito = reentrega já vista.
  const inserted = await db
    .insert(webhookInbox)
    .values({
      provider: event.provider,
      eventId: event.eventId,
      eventType: event.eventType,
      payload: event as unknown as Record<string, unknown>,
    })
    .onConflictDoNothing({
      target: [webhookInbox.provider, webhookInbox.eventId],
    })
    .returning({ id: webhookInbox.id });

  if (inserted.length === 0) {
    return { applied: true, alreadyProcessed: true, grantedEntitlement: false };
  }
  const inboxId = inserted[0].id;

  try {
    if (!event.orderId) {
      await markProcessed(inboxId, "Evento sem pedido associado.");
      return { applied: false, reason: "Evento sem orderId." };
    }

    const order = await db.query.orders.findFirst({
      where: eq(orders.id, event.orderId),
    });
    if (!order) {
      await markProcessed(inboxId, "Pedido não encontrado.");
      return { applied: false, reason: "Pedido não encontrado." };
    }

    const result = await db.transaction(async (tx) => {
      // Registro do pagamento (único por provedor+id).
      await tx
        .insert(payments)
        .values({
          orderId: order.id,
          workspaceId: order.workspaceId,
          provider: event.provider,
          providerPaymentId: event.providerPaymentId,
          status:
            event.status === "paid"
              ? "paid"
              : event.status === "refunded"
                ? "refunded"
                : event.status === "partially_refunded"
                  ? "partially_refunded"
                  : event.status === "failed"
                    ? "failed"
                    : "pending",
          amountCents: event.amountCents ?? order.amountCents,
          refundedCents: event.refundedCents ?? 0,
          method: event.method,
          paidAt: event.status === "paid" ? new Date() : null,
        })
        .onConflictDoUpdate({
          target: [payments.provider, payments.providerPaymentId],
          set: {
            status:
              event.status === "paid"
                ? "paid"
                : event.status === "refunded"
                  ? "refunded"
                  : event.status === "partially_refunded"
                    ? "partially_refunded"
                    : event.status === "failed"
                      ? "failed"
                      : "pending",
            refundedCents: event.refundedCents ?? 0,
          },
        });

      if (event.status === "paid") {
        // Fora de ordem: se o pedido já está pago, nada regride.
        if (order.status !== "paid") {
          await tx
            .update(orders)
            .set({ status: "paid", updatedAt: new Date() })
            .where(eq(orders.id, order.id));
        }

        const snapshot = order.offerSnapshot as unknown as OfferSnapshot;
        const plan = PLANS[snapshot.planId];

        const startsAt = new Date();
        const endsAt =
          snapshot.planId === "vitalicio"
            ? null
            : new Date(
                startsAt.getTime() +
                  snapshot.periodMonths * 30 * 24 * 3600 * 1000,
              );

        // Grant único por pedido — reentrega não concede de novo.
        const grant = await tx
          .insert(entitlementGrants)
          .values({
            workspaceId: order.workspaceId,
            planId: snapshot.planId,
            source: snapshot.planId === "vitalicio" ? "one_time" : "subscription",
            orderId: order.id,
            startsAt,
            endsAt,
          })
          .onConflictDoNothing({ target: entitlementGrants.orderId })
          .returning({ id: entitlementGrants.id });

        return { grantedEntitlement: grant.length > 0, snapshot, plan };
      }

      if (event.status === "refunded" || event.status === "partially_refunded") {
        await tx
          .update(orders)
          .set({ status: "refunded", updatedAt: new Date() })
          .where(eq(orders.id, order.id));
        // Reembolso revoga o direito; o conteúdo do cliente NÃO é apagado.
        await tx
          .update(entitlementGrants)
          .set({
            revokedAt: new Date(),
            revokedReason:
              event.status === "refunded"
                ? "Reembolso total"
                : "Reembolso parcial",
          })
          .where(eq(entitlementGrants.orderId, order.id));
        return { grantedEntitlement: false, snapshot: null, plan: null };
      }

      if (event.status === "failed") {
        if (order.status !== "paid") {
          await tx
            .update(orders)
            .set({ status: "pending", updatedAt: new Date() })
            .where(eq(orders.id, order.id));
        }
      }

      return { grantedEntitlement: false, snapshot: null, plan: null };
    });

    // Cupom: o resgate só conta depois do pagamento confirmado (spec §12.3).
    // Falha ou reembolso devolvem a vaga; por padrão, reembolso NÃO restaura
    // uma promoção de uso único já consumida.
    if (event.status === "paid") {
      await redeemCoupon({
        orderId: order.id,
        discountCents: Math.max(0, order.amountCents - (event.amountCents ?? order.amountCents)),
      });
    } else if (event.status === "failed") {
      await releaseCoupon(order.id);
    }

    // Créditos do período são concedidos fora da transação de direitos, com a
    // própria chave de período — recarga do mesmo ciclo nunca duplica.
    if (result.grantedEntitlement && result.snapshot && result.snapshot.credits > 0) {
      const period = new Date().toISOString().slice(0, 7); // AAAA-MM
      await grantCredits({
        workspaceId: order.workspaceId,
        amount: result.snapshot.credits,
        source: "subscription",
        orderId: order.id,
        periodKey: `${order.id}:${period}`,
        expiresAt:
          result.snapshot.planId === "vitalicio"
            ? null
            : new Date(Date.now() + 31 * 24 * 3600 * 1000),
        reason: `Créditos do plano ${result.snapshot.label}`,
      });
    }

    await markProcessed(inboxId);
    return {
      applied: true,
      alreadyProcessed: false,
      grantedEntitlement: result.grantedEntitlement,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await markProcessed(inboxId, message.slice(0, 1000));
    throw err;
  }
}

async function markProcessed(inboxId: string, error?: string): Promise<void> {
  const db = await getDb();
  await db
    .update(webhookInbox)
    .set({ processedAt: new Date(), error: error ?? null })
    .where(eq(webhookInbox.id, inboxId));
}
