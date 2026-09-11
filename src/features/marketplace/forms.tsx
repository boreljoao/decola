"use client";

import { useActionState } from "react";
import {
  submitApplicationAction,
  submitContactAction,
  type FormResult,
} from "./actions";

/** Campos de marketing: superfícies claras e foco visível. */
function MarketingField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-medium text-ink-900">{label}</span>
      {hint && <span className="text-xs text-ink-600">{hint}</span>}
      {children}
    </label>
  );
}

const inputClass =
  "rounded-xl border border-ink-900/15 bg-card px-3.5 py-3 text-base text-ink-900 placeholder:text-ink-600 focus:border-electric-500";

function Feedback({ state }: { state: FormResult }) {
  if (state.error) {
    return (
      <p role="alert" className="text-sm font-medium text-danger-600">
        {state.error}
      </p>
    );
  }
  if (state.ok && state.message) {
    return (
      <p className="rounded-xl bg-electric-600/10 px-4 py-3 text-sm text-electric-700">
        {state.message}
      </p>
    );
  }
  return null;
}

export function ProfessionalApplicationForm() {
  const [state, action, pending] = useActionState<FormResult, FormData>(
    submitApplicationAction,
    { ok: false },
  );

  return (
    <form action={action} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <MarketingField label="Seu nome">
          <input name="name" required maxLength={120} className={inputClass} />
        </MarketingField>
        <MarketingField label="E-mail">
          <input
            name="email"
            type="email"
            required
            className={inputClass}
            placeholder="voce@exemplo.com.br"
          />
        </MarketingField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <MarketingField label="Telefone (opcional)">
          <input
            name="phone"
            className={inputClass}
            placeholder="(11) 91234-5678"
          />
        </MarketingField>
        <MarketingField label="Especialidade">
          <input
            name="specialty"
            required
            className={inputClass}
            placeholder="Ex.: copywriting, design de páginas, tráfego pago"
          />
        </MarketingField>
      </div>
      <MarketingField
        label="Sua experiência"
        hint="Conte onde você já atuou e que tipo de negócio você atende melhor."
      >
        <textarea
          name="experience"
          required
          rows={4}
          minLength={20}
          maxLength={2000}
          className={inputClass}
        />
      </MarketingField>
      <MarketingField
        label="Portfólio (opcional)"
        hint="Um link https para o seu trabalho."
      >
        <input
          name="portfolioUrl"
          type="url"
          className={inputClass}
          placeholder="https://"
        />
      </MarketingField>

      <Feedback state={state} />

      <div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-ink-900 min-h-11 px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-ink-600 disabled:opacity-60"
        >
          {pending ? "Enviando…" : "Enviar candidatura"}
        </button>
      </div>
    </form>
  );
}

export function ContactForm({ kind }: { kind: "contato" | "agencia" }) {
  const [state, action, pending] = useActionState<FormResult, FormData>(
    submitContactAction,
    { ok: false },
  );

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="kind" value={kind} />
      <div className="grid gap-4 sm:grid-cols-2">
        <MarketingField label="Seu nome">
          <input name="name" required maxLength={120} className={inputClass} />
        </MarketingField>
        <MarketingField label="E-mail">
          <input name="email" type="email" required className={inputClass} />
        </MarketingField>
      </div>
      <MarketingField
        label={kind === "agencia" ? "Agência" : "Empresa (opcional)"}
      >
        <input name="company" maxLength={120} className={inputClass} />
      </MarketingField>
      <MarketingField
        label="Mensagem"
        hint={
          kind === "agencia"
            ? "Quantos clientes você atende hoje e o que precisa da Decola?"
            : "Como podemos ajudar?"
        }
      >
        <textarea
          name="message"
          required
          rows={4}
          minLength={10}
          maxLength={2000}
          className={inputClass}
        />
      </MarketingField>

      <Feedback state={state} />

      <div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-ink-900 min-h-11 px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-ink-600 disabled:opacity-60"
        >
          {pending ? "Enviando…" : "Enviar mensagem"}
        </button>
      </div>
    </form>
  );
}
