import "server-only";
import { env } from "@/config/env";
import { MercadoPagoProvider } from "./mercadopago-provider";
import type { PaymentProvider, PaymentProviderId } from "./payment-provider";
import { StripeProvider } from "./stripe-provider";

/**
 * Seleção do adapter de pagamento. Vive fora do arquivo de server actions
 * porque um módulo "use server" só pode exportar funções assíncronas.
 */
export function getPaymentProvider(id: PaymentProviderId): PaymentProvider {
  return id === "stripe" ? new StripeProvider() : new MercadoPagoProvider();
}

export interface ProviderAvailability {
  id: PaymentProviderId;
  label: string;
  available: boolean;
  reason?: string;
}

export function paymentAvailability(): ProviderAvailability[] {
  const e = env();
  return [
    {
      id: "stripe",
      label: "Cartão de crédito",
      available: e.capabilities.stripe,
      reason: e.capabilities.stripe
        ? undefined
        : "Pagamento com cartão em ativação (aguardando configuração do provedor).",
    },
    {
      id: "mercadopago",
      label: "Pix",
      available: e.capabilities.mercadopagoPix,
      reason: e.capabilities.mercadopagoPix
        ? undefined
        : "Pix em ativação (aguardando configuração do provedor).",
    },
  ];
}
