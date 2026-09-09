"use client";

import { useState, useTransition } from "react";
import { Badge, Button, cx } from "@/components/ui";
import { createCheckoutAction } from "./checkout";
import type { ProviderAvailability } from "./provider-registry";

/**
 * Contratação (spec §20): só aparece habilitada quando o provedor está
 * realmente configurado. Indisponível mostra o motivo — nunca um botão que
 * finge funcionar.
 */

export function CheckoutButtons({
  planId,
  period,
  providers,
  blockedReason,
}: {
  planId: "start" | "pro" | "business";
  period: "monthly" | "annual";
  providers: ProviderAvailability[];
  blockedReason?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pix, setPix] = useState<{
    copyPaste: string;
    qrCodeBase64?: string;
    expiresAt: string;
  } | null>(null);

  const anyAvailable = providers.some((p) => p.available);

  if (blockedReason) {
    return (
      <div className="grid gap-2">
        <span className="block cursor-not-allowed rounded-xl border border-white/15 py-3 text-center text-sm font-semibold text-mist-500">
          Sob consulta
        </span>
        <p className="text-center text-xs text-mist-700">{blockedReason}</p>
      </div>
    );
  }

  if (!anyAvailable) {
    return (
      <div className="grid gap-2">
        <span className="block cursor-not-allowed rounded-xl border border-white/15 py-3 text-center text-sm font-semibold text-mist-500">
          Contratação em breve
        </span>
        <p className="text-center text-xs text-mist-700">
          {providers.find((p) => p.reason)?.reason ??
            "Pagamento em ativação."}{" "}
          Comece no Free — seu trabalho é preservado no upgrade.
        </p>
      </div>
    );
  }

  function start(provider: "stripe" | "mercadopago") {
    setError(null);
    setPix(null);
    startTransition(async () => {
      const result = await createCheckoutAction({ planId, period, provider });
      if (!result.ok) {
        setError(result.error ?? "Falha ao iniciar o pagamento.");
        return;
      }
      if (result.redirectUrl) {
        window.location.href = result.redirectUrl;
        return;
      }
      if (result.pix) setPix(result.pix);
    });
  }

  return (
    <div className="grid gap-2">
      {providers
        .filter((p) => p.available)
        .map((p, index) => (
          <Button
            key={p.id}
            variant={index === 0 ? "commercial" : "secondary"}
            disabled={pending}
            onClick={() => start(p.id)}
            className="w-full"
          >
            {pending ? "Abrindo pagamento…" : `Assinar com ${p.label}`}
          </Button>
        ))}

      {providers
        .filter((p) => !p.available)
        .map((p) => (
          <p key={p.id} className="text-center text-xs text-mist-700">
            {p.label}: {p.reason}
          </p>
        ))}

      {error && (
        <p role="alert" className="text-center text-xs font-medium text-red-400">
          {error}
        </p>
      )}

      {pix && (
        <div className="grid gap-2 rounded-xl border border-white/15 bg-night-800 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Pague com Pix</p>
            <Badge tone="warning">confirmando</Badge>
          </div>
          {pix.qrCodeBase64 && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`data:image/png;base64,${pix.qrCodeBase64}`}
              alt="QR Code do Pix"
              className="mx-auto h-44 w-44 rounded-lg bg-white p-2"
            />
          )}
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(pix.copyPaste)}
            className={cx(
              "truncate rounded-lg border border-white/15 px-3 py-2 text-left text-xs",
              "hover:bg-white/5",
            )}
          >
            Copiar código: {pix.copyPaste.slice(0, 32)}…
          </button>
          <p className="text-xs text-mist-500">
            Válido até{" "}
            {new Date(pix.expiresAt).toLocaleString("pt-BR", {
              timeZone: "America/Sao_Paulo",
            })}
            . O plano é liberado quando o pagamento for confirmado pelo banco —
            voltar desta tela não ativa nada.
          </p>
        </div>
      )}
    </div>
  );
}
