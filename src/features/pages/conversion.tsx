"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Componentes interativos da página publicada: rastreio de eventos primários,
 * formulário de lead e beacon de page_view. First-party, sem cookies e sem
 * identificadores persistentes por padrão (spec §13.1).
 */

interface TrackContext {
  pageId: string;
  pageVersionId?: string;
  /** preview não registra eventos (separação preview/produção). */
  disabled?: boolean;
}

function sendEvent(
  ctx: TrackContext,
  type: string,
  eventKey?: string,
): void {
  if (ctx.disabled) return;
  const body = JSON.stringify({
    pageId: ctx.pageId,
    pageVersionId: ctx.pageVersionId,
    type,
    eventKey: eventKey ?? crypto.randomUUID(),
  });
  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/public/events", body);
  } else {
    void fetch("/api/public/events", {
      method: "POST",
      body,
      keepalive: true,
      headers: { "content-type": "application/json" },
    });
  }
}

export function AnalyticsBeacon(ctx: TrackContext) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    sendEvent(ctx, "page_view");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

export function TrackedCta({
  href,
  eventType,
  external,
  className,
  children,
  ...ctx
}: TrackContext & {
  href: string;
  eventType: "whatsapp_click" | "cta_click";
  external: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const onClick = useCallback(() => {
    sendEvent(ctx, eventType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventType, ctx.pageId, ctx.disabled]);
  return (
    <a
      href={href}
      onClick={onClick}
      className={className}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
    </a>
  );
}

export function LeadForm({
  pageId,
  pageVersionId,
  disabled,
  fields,
  submitLabel,
  successMessage,
  accentStyle,
  radiusClass,
}: TrackContext & {
  fields: Array<{ id: string; label: string; required: boolean }>;
  submitLabel: string;
  successMessage: string;
  accentStyle: React.CSSProperties;
  radiusClass: string;
}) {
  const [state, setState] = useState<"idle" | "sending" | "success" | "error">(
    "idle",
  );
  const [errorMsg, setErrorMsg] = useState<string>("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state === "sending") return;
    const form = e.currentTarget;
    const data: Record<string, string> = {};
    for (const f of fields) {
      const el = form.elements.namedItem(f.id) as HTMLInputElement | HTMLTextAreaElement | null;
      if (el) data[f.id] = el.value;
    }
    const honeypot =
      (form.elements.namedItem("website") as HTMLInputElement | null)?.value ?? "";

    if (disabled) {
      // Preview: não persiste lead nem evento; demonstra o fluxo.
      setState("success");
      return;
    }

    setState("sending");
    setErrorMsg("");
    try {
      const res = await fetch("/api/public/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          pageId,
          pageVersionId,
          data,
          website: honeypot,
          submissionKey: crypto.randomUUID(),
        }),
      });
      const json = (await res.json()) as { ok: boolean; message?: string };
      if (!res.ok || !json.ok) {
        throw new Error(json.message ?? "Não foi possível enviar. Tente novamente.");
      }
      sendEvent({ pageId, pageVersionId, disabled }, "form_submit_success");
      setState("success");
    } catch (err) {
      setState("error");
      setErrorMsg(
        err instanceof Error ? err.message : "Não foi possível enviar. Tente novamente.",
      );
    }
  }

  if (state === "success") {
    return (
      <div
        role="status"
        className={`${radiusClass} border border-current/10 p-6 text-center text-base font-medium`}
      >
        {successMessage}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate={false}>
      {fields.map((f) => (
        <label key={f.id} className="grid gap-1.5 text-sm font-medium">
          <span>
            {f.label}
            {f.required ? " *" : ""}
          </span>
          {f.id === "mensagem" ? (
            <textarea
              name={f.id}
              required={f.required}
              rows={3}
              className={`${radiusClass} border border-current/20 bg-transparent px-3.5 py-2.5 text-base outline-none focus:border-current/50`}
            />
          ) : (
            <input
              name={f.id}
              type={f.id === "email" ? "email" : f.id === "telefone" ? "tel" : "text"}
              required={f.required}
              className={`${radiusClass} border border-current/20 bg-transparent px-3.5 py-2.5 text-base outline-none focus:border-current/50`}
            />
          )}
        </label>
      ))}
      {/* honeypot antispam — invisível para pessoas */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
      />
      {state === "error" && (
        <p role="alert" className="text-sm font-medium text-red-600">
          {errorMsg}
        </p>
      )}
      <button
        type="submit"
        disabled={state === "sending"}
        style={accentStyle}
        className={`${radiusClass} px-6 py-3.5 text-base font-semibold transition-opacity disabled:opacity-60`}
      >
        {state === "sending" ? "Enviando…" : submitLabel}
      </button>
    </form>
  );
}
