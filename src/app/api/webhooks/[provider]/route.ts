import { NextResponse } from "next/server";
import { applyPaymentEvent } from "@/features/billing/apply-event";
import { PaymentError } from "@/features/billing/payment-provider";
import { getPaymentProvider } from "@/features/billing/provider-registry";

/**
 * Webhook de pagamento (spec §12.1).
 * - Assinatura verificada com o CORPO ORIGINAL (sem reserializar).
 * - Evento validado é gravado durablemente antes de qualquer concessão.
 * - Falha ao persistir devolve 5xx para o provedor reentregar; assinatura
 *   inválida devolve 400 e nada é aplicado.
 * - Webhooks NÃO usam token CSRF de navegador — a autenticidade vem da
 *   assinatura do provedor.
 */

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: RouteContext<"/api/webhooks/[provider]">,
) {
  const { provider } = await context.params;
  if (provider !== "stripe" && provider !== "mercadopago") {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  const rawBody = await request.text();

  let adapter;
  try {
    adapter = getPaymentProvider(provider);
  } catch {
    // Provedor não configurado: nada a processar, mas não é erro do remetente.
    return NextResponse.json(
      { ok: false, reason: "provider_not_configured" },
      { status: 503 },
    );
  }

  let event;
  try {
    event = await adapter.verifyAndNormalize(rawBody, request.headers);
  } catch (err) {
    if (err instanceof PaymentError && err.code === "invalid_signature") {
      return NextResponse.json(
        { ok: false, reason: "invalid_signature" },
        { status: 400 },
      );
    }
    // Falha transitória ao consultar o provedor: peça reentrega.
    return NextResponse.json(
      { ok: false, reason: "verification_failed" },
      { status: 503 },
    );
  }

  try {
    const result = await applyPaymentEvent(event);
    return NextResponse.json({ ok: true, ...result });
  } catch {
    // Não conseguimos persistir: 5xx para o provedor reentregar.
    return NextResponse.json(
      { ok: false, reason: "processing_failed" },
      { status: 500 },
    );
  }
}
