import "server-only";
import Stripe from "stripe";
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
 * Adapter Stripe (cartão e assinatura). Estado:
 * implementada_aguardando_configuracao (STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET).
 *
 * Parcelamento NÃO é declarado como capability: depende de habilitação por
 * conta e país, então não prometemos o que não foi verificado (spec §12.1).
 */
export class StripeProvider implements PaymentProvider {
  readonly id = "stripe" as const;
  readonly capabilities: PaymentCapabilities = {
    card: true,
    subscription: true,
    pix: false,
    installments: false,
    refund: true,
    partialRefund: true,
  };

  private client: Stripe;

  constructor() {
    const e = env();
    if (!e.capabilities.stripe) {
      throw new PaymentError(
        "not_configured",
        "Stripe não configurado (STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET).",
      );
    }
    this.client = new Stripe(e.STRIPE_SECRET_KEY!);
  }

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    try {
      const session = await this.client.checkout.sessions.create(
        {
          mode: input.recurring ? "subscription" : "payment",
          customer_email: input.customerEmail,
          success_url: input.successUrl,
          cancel_url: input.cancelUrl,
          // orderId volta no webhook: é assim que ligamos evento → pedido.
          metadata: { orderId: input.orderId },
          line_items: [
            {
              quantity: 1,
              price_data: {
                currency: "brl",
                unit_amount: input.amountCents,
                product_data: { name: input.description },
                ...(input.recurring
                  ? {
                      recurring: {
                        interval: "month" as const,
                        interval_count: input.recurring.intervalMonths,
                      },
                    }
                  : {}),
              },
            },
          ],
        },
        { idempotencyKey: input.idempotencyKey },
      );

      return {
        providerCheckoutId: session.id,
        redirectUrl: session.url ?? undefined,
      };
    } catch (err) {
      throw new PaymentError(
        "provider_error",
        err instanceof Error ? err.message : "Falha ao criar o checkout.",
      );
    }
  }

  async verifyAndNormalize(
    rawBody: string,
    headers: Headers,
  ): Promise<NormalizedPaymentEvent> {
    const signature = headers.get("stripe-signature");
    if (!signature) {
      throw new PaymentError("invalid_signature", "Assinatura ausente.");
    }

    let event: Stripe.Event;
    try {
      // Corpo ORIGINAL, exigido pela verificação de assinatura.
      event = this.client.webhooks.constructEvent(
        rawBody,
        signature,
        env().STRIPE_WEBHOOK_SECRET!,
      );
    } catch (err) {
      throw new PaymentError(
        "invalid_signature",
        err instanceof Error ? err.message : "Assinatura inválida.",
      );
    }

    const base = {
      provider: this.id,
      eventId: event.id,
      eventType: event.type,
    };

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        return {
          ...base,
          providerPaymentId:
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : session.id,
          orderId: session.metadata?.orderId,
          status: session.payment_status === "paid" ? "paid" : "pending",
          amountCents: session.amount_total ?? undefined,
          method: "card",
        };
      }
      case "charge.refunded": {
        const charge = event.data.object;
        return {
          ...base,
          providerPaymentId:
            typeof charge.payment_intent === "string"
              ? charge.payment_intent
              : charge.id,
          status:
            charge.amount_refunded >= charge.amount
              ? "refunded"
              : "partially_refunded",
          amountCents: charge.amount,
          refundedCents: charge.amount_refunded,
        };
      }
      case "payment_intent.payment_failed": {
        const intent = event.data.object;
        return {
          ...base,
          providerPaymentId: intent.id,
          orderId: intent.metadata?.orderId,
          status: "failed",
        };
      }
      default:
        return {
          ...base,
          providerPaymentId: event.id,
          status: "pending",
        };
    }
  }
}
