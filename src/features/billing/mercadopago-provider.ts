import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/config/env";
import {
  PaymentError,
  type CheckoutInput,
  type CheckoutResult,
  type NormalizedPaymentEvent,
  type PaymentCapabilities,
  type PaymentProvider,
} from "./payment-provider";

/**
 * Adapter Mercado Pago (Pix avulso). Estado:
 * implementada_aguardando_configuracao (MERCADOPAGO_ACCESS_TOKEN).
 *
 * Recorrência por Pix NÃO é declarada: depende de capacidade real da conta
 * (spec §2). Sem isso, renovação é nova cobrança com comunicação explícita.
 */
export class MercadoPagoProvider implements PaymentProvider {
  readonly id = "mercadopago" as const;
  readonly capabilities: PaymentCapabilities = {
    card: false,
    subscription: false,
    pix: true,
    installments: false,
    refund: true,
    partialRefund: false,
  };

  private accessToken: string;

  constructor() {
    const e = env();
    if (!e.capabilities.mercadopagoPix) {
      throw new PaymentError(
        "not_configured",
        "Mercado Pago não configurado (MERCADOPAGO_ACCESS_TOKEN).",
      );
    }
    this.accessToken = e.MERCADOPAGO_ACCESS_TOKEN!;
  }

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    if (input.recurring) {
      throw new PaymentError(
        "unsupported",
        "Pix recorrente não está habilitado — a renovação é feita por nova cobrança.",
      );
    }

    const response = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.accessToken}`,
        "content-type": "application/json",
        "X-Idempotency-Key": input.idempotencyKey,
      },
      body: JSON.stringify({
        transaction_amount: input.amountCents / 100,
        description: input.description,
        payment_method_id: "pix",
        payer: { email: input.customerEmail },
        metadata: { order_id: input.orderId },
        external_reference: input.orderId,
      }),
    });

    if (!response.ok) {
      throw new PaymentError(
        "provider_error",
        `Mercado Pago recusou a cobrança (${response.status}).`,
      );
    }

    const data = (await response.json()) as {
      id: number;
      date_of_expiration?: string;
      point_of_interaction?: {
        transaction_data?: { qr_code?: string; qr_code_base64?: string };
      };
    };

    const pixData = data.point_of_interaction?.transaction_data;
    if (!pixData?.qr_code) {
      throw new PaymentError(
        "provider_error",
        "O provedor não retornou o código Pix.",
      );
    }

    return {
      providerCheckoutId: String(data.id),
      pix: {
        copyPaste: pixData.qr_code,
        qrCodeBase64: pixData.qr_code_base64,
        expiresAt:
          data.date_of_expiration ??
          new Date(Date.now() + 30 * 60_000).toISOString(),
      },
    };
  }

  async verifyAndNormalize(
    rawBody: string,
    headers: Headers,
  ): Promise<NormalizedPaymentEvent> {
    const secret = env().MERCADOPAGO_WEBHOOK_SECRET;
    const signatureHeader = headers.get("x-signature");
    const requestId = headers.get("x-request-id");

    if (secret) {
      // Formato do MP: "ts=<timestamp>,v1=<hash>"
      const parts = Object.fromEntries(
        (signatureHeader ?? "")
          .split(",")
          .map((p) => p.split("=").map((s) => s.trim()))
          .filter((p) => p.length === 2),
      );
      const ts = parts.ts;
      const v1 = parts.v1;
      if (!ts || !v1) {
        throw new PaymentError("invalid_signature", "Assinatura ausente.");
      }
      const dataId = (JSON.parse(rawBody) as { data?: { id?: string } })?.data
        ?.id;
      const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
      const expected = createHmac("sha256", secret)
        .update(manifest)
        .digest("hex");
      const a = Buffer.from(expected, "hex");
      const b = Buffer.from(v1, "hex");
      if (a.length !== b.length || !timingSafeEqual(a, b)) {
        throw new PaymentError("invalid_signature", "Assinatura inválida.");
      }
    } else if (env().mode === "production") {
      throw new PaymentError(
        "not_configured",
        "MERCADOPAGO_WEBHOOK_SECRET é obrigatório em produção.",
      );
    }

    const body = JSON.parse(rawBody) as {
      id?: number | string;
      type?: string;
      action?: string;
      data?: { id?: string };
    };
    const paymentId = body.data?.id;
    if (!paymentId) {
      throw new PaymentError("provider_error", "Evento sem id de pagamento.");
    }

    // O webhook do MP é apenas uma notificação: o estado real vem da consulta.
    const payment = await this.fetchPayment(paymentId);

    return {
      provider: this.id,
      eventId: String(body.id ?? `${paymentId}:${payment.status}`),
      eventType: body.action ?? body.type ?? "payment.updated",
      providerPaymentId: String(paymentId),
      orderId: payment.external_reference,
      status:
        payment.status === "approved"
          ? "paid"
          : payment.status === "refunded"
            ? "refunded"
            : payment.status === "rejected" || payment.status === "cancelled"
              ? "failed"
              : "pending",
      amountCents: Math.round((payment.transaction_amount ?? 0) * 100),
      method: "pix",
    };
  }

  private async fetchPayment(paymentId: string) {
    const response = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      { headers: { authorization: `Bearer ${this.accessToken}` } },
    );
    if (!response.ok) {
      throw new PaymentError(
        "provider_error",
        `Falha ao consultar o pagamento (${response.status}).`,
      );
    }
    return (await response.json()) as {
      status?: string;
      transaction_amount?: number;
      external_reference?: string;
    };
  }
}
