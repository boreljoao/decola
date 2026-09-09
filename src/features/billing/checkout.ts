"use server";

import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  CATALOG_VERSION,
  PLANS,
  formatBRL,
  type PlanId,
} from "@/config/commercial-policy";
import { env } from "@/config/env";
import { assertRole, requireWorkspace } from "@/server/auth";
import { getDb } from "@/server/db";
import { auditLog, orders } from "@/server/db/schema";
import type { OfferSnapshot } from "./apply-event";
import { PaymentError, type PaymentProvider } from "./payment-provider";
import {
  getPaymentProvider,
  paymentAvailability,
  type ProviderAvailability,
} from "./provider-registry";

/**
 * Criação de checkout (spec §12.1): o cliente envia o PRODUTO, nunca o preço.
 * O servidor calcula a oferta a partir do catálogo, grava o snapshot imutável
 * e cria a intenção com chave de idempotência.
 */

/** Disponibilidade real dos meios de pagamento, para a UI decidir o que oferecer. */
export async function listPaymentAvailability(): Promise<ProviderAvailability[]> {
  return paymentAvailability();
}

const checkoutInput = z.object({
  planId: z.enum(["start", "pro", "business"]),
  period: z.enum(["monthly", "annual"]),
  provider: z.enum(["stripe", "mercadopago"]),
});

export interface CheckoutActionResult {
  ok: boolean;
  redirectUrl?: string;
  pix?: { copyPaste: string; qrCodeBase64?: string; expiresAt: string };
  orderId?: string;
  error?: string;
}

export async function createCheckoutAction(
  raw: unknown,
): Promise<CheckoutActionResult> {
  const parsed = checkoutInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Escolha inválida." };

  const { planId, period, provider: providerId } = parsed.data;
  const plan = PLANS[planId as PlanId];

  // Oferta indisponível para venda não gera pedido (spec §3.1).
  if (!plan.sellable) {
    return {
      ok: false,
      error:
        plan.sellableBlockedReason ??
        "Este plano ainda não está disponível para contratação.",
    };
  }

  const priceValue =
    period === "annual"
      ? plan.annualPriceCents
      : plan.monthlyPriceCents;
  if (priceValue.status !== "approved" || priceValue.value == null) {
    return {
      ok: false,
      error:
        "O preço deste plano ainda não foi aprovado — a contratação está indisponível.",
    };
  }
  const amountCents = priceValue.value;

  const creditsPolicy = plan.entitlements.monthlyCredits;
  const ctx = await requireWorkspace();
  assertRole(ctx, "owner");

  const periodMonths = period === "annual" ? 12 : 1;
  const snapshot: OfferSnapshot = {
    planId: plan.id,
    periodMonths,
    credits: creditsPolicy.value,
    label: `${plan.name} ${period === "annual" ? "anual" : "mensal"}`,
  };

  // Uma intenção de compra por (workspace, plano, período, catálogo, dia):
  // duplo clique não cria dois pedidos.
  const idempotencyKey = createHash("sha256")
    .update(
      [
        ctx.workspaceId,
        plan.id,
        period,
        CATALOG_VERSION,
        new Date().toISOString().slice(0, 10),
      ].join(":"),
    )
    .digest("hex")
    .slice(0, 48);

  const db = await getDb();

  let provider: PaymentProvider;
  try {
    provider = getPaymentProvider(providerId);
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof PaymentError
          ? "Esta forma de pagamento ainda não está ativa neste ambiente."
          : "Falha ao iniciar o pagamento.",
    };
  }

  if (period === "annual" && providerId === "mercadopago") {
    // Pix anual é cobrança única de período pré-pago; recorrência não existe aqui.
    // Mantido explícito para não sugerir assinatura automática.
  }
  if (providerId === "mercadopago" && !provider.capabilities.pix) {
    return { ok: false, error: "Pix indisponível nesta conta." };
  }

  const [order] = await db
    .insert(orders)
    .values({
      workspaceId: ctx.workspaceId,
      offerSnapshot: snapshot as unknown as Record<string, unknown>,
      catalogVersion: CATALOG_VERSION,
      amountCents,
      provider: providerId,
      idempotencyKey,
      status: "pending",
      createdBy: ctx.user.profileId,
    })
    .onConflictDoUpdate({
      target: orders.idempotencyKey,
      set: { updatedAt: new Date() },
    })
    .returning();

  // Pedido já pago (reentrada na tela): não cria novo checkout.
  if (order.status === "paid") {
    return { ok: false, error: "Este plano já está ativo no seu workspace." };
  }

  try {
    const appUrl = env().APP_URL;
    const checkout = await provider.createCheckout({
      orderId: order.id,
      amountCents,
      description: `Decola — ${snapshot.label}`,
      idempotencyKey,
      successUrl: `${appUrl}/app/cobranca?pedido=${order.id}`,
      cancelUrl: `${appUrl}/precos`,
      customerEmail: ctx.user.email,
      recurring:
        providerId === "stripe" && period === "monthly"
          ? { intervalMonths: 1 }
          : undefined,
    });

    await db
      .update(orders)
      .set({
        status: "awaiting_payment",
        providerCheckoutId: checkout.providerCheckoutId,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));

    await db.insert(auditLog).values({
      workspaceId: ctx.workspaceId,
      actorProfileId: ctx.user.profileId,
      action: "billing.checkout_created",
      target: order.id,
      meta: {
        planId: plan.id,
        period,
        amount: formatBRL(amountCents),
        provider: providerId,
      },
    });

    return {
      ok: true,
      orderId: order.id,
      redirectUrl: checkout.redirectUrl,
      pix: checkout.pix,
    };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof PaymentError
          ? err.message
          : "Não foi possível iniciar o pagamento. Tente novamente.",
    };
  }
}
