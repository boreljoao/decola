import "server-only";

/**
 * Fronteira de pagamento (spec §2.2): capabilities, checkout, consulta,
 * verificação de webhook e normalização de eventos.
 * Nenhum provedor suporta tudo — `capabilities` diz o que é real, e a UI só
 * oferece o que está disponível.
 */

export type PaymentProviderId = "stripe" | "mercadopago";

export interface PaymentCapabilities {
  card: boolean;
  subscription: boolean;
  pix: boolean;
  installments: boolean;
  refund: boolean;
  partialRefund: boolean;
}

export interface CheckoutInput {
  orderId: string;
  amountCents: number;
  description: string;
  /** Chave de idempotência da intenção de compra. */
  idempotencyKey: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail: string;
  /** Assinatura recorrente (só onde a capability existir). */
  recurring?: { intervalMonths: number };
}

export interface CheckoutResult {
  providerCheckoutId: string;
  /** URL para redirecionar (cartão) — ausente em fluxos Pix. */
  redirectUrl?: string;
  /** Pix: QR e copia-e-cola reais do provedor. */
  pix?: { qrCodeBase64?: string; copyPaste: string; expiresAt: string };
}

/** Evento de pagamento já normalizado — o worker não conhece o provedor. */
export interface NormalizedPaymentEvent {
  provider: PaymentProviderId;
  eventId: string;
  eventType: string;
  /** Id do pagamento no provedor (único por provedor). */
  providerPaymentId: string;
  /** Nosso orderId, propagado como metadata na criação do checkout. */
  orderId?: string;
  status: "paid" | "failed" | "refunded" | "partially_refunded" | "pending";
  amountCents?: number;
  refundedCents?: number;
  method?: string;
}

export class PaymentError extends Error {
  constructor(
    public code:
      | "not_configured"
      | "invalid_signature"
      | "provider_error"
      | "unsupported",
    message: string,
  ) {
    super(message);
    this.name = "PaymentError";
  }
}

export interface PaymentProvider {
  readonly id: PaymentProviderId;
  readonly capabilities: PaymentCapabilities;
  createCheckout(input: CheckoutInput): Promise<CheckoutResult>;
  /**
   * Verifica a assinatura do webhook usando o CORPO ORIGINAL (não reserializado)
   * e devolve o evento normalizado. Assinatura inválida lança.
   */
  verifyAndNormalize(
    rawBody: string,
    headers: Headers,
  ): Promise<NormalizedPaymentEvent>;
}
