"use client";

import { useActionState } from "react";
import {
  submitApplicationAction,
  submitContactAction,
  type FormResult,
} from "./actions";

/** Campos com estilo do tema escuro do marketing. */
function DarkField({
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
      <span className="text-sm font-medium text-mist-100">{label}</span>
      {hint && <span className="text-xs text-mist-500">{hint}</span>}
      {children}
    </label>
  );
}

const inputClass =
  "rounded-xl border border-white/15 bg-night-850 px-3.5 py-2.5 text-sm text-mist-100 placeholder:text-mist-700 focus:border-electric-500 focus:outline-none";

function Feedback({ state }: { state: FormResult }) {
  if (state.error) {
    return (
      <p role="alert" className="text-sm font-medium text-red-400">
        {state.error}
      </p>
    );
  }
  if (state.ok && state.message) {
    return (
      <p className="rounded-xl bg-electric-600/10 px-4 py-3 text-sm text-electric-300">
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
        <DarkField label="Seu nome">
          <input name="name" required maxLength={120} className={inputClass} />
        </DarkField>
        <DarkField label="E-mail">
          <input
            name="email"
            type="email"
            required
            className={inputClass}
            placeholder="voce@exemplo.com.br"
          />
        </DarkField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <DarkField label="Telefone (opcional)">
          <input name="phone" className={inputClass} placeholder="(11) 91234-5678" />
        </DarkField>
        <DarkField label="Especialidade">
          <input
            name="specialty"
            required
            className={inputClass}
            placeholder="Ex.: copywriting, design de páginas, tráfego pago"
          />
        </DarkField>
      </div>
      <DarkField
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
      </DarkField>
      <DarkField label="Portfólio (opcional)" hint="Um link https para o seu trabalho.">
        <input name="portfolioUrl" type="url" className={inputClass} placeholder="https://" />
      </DarkField>

      <Feedback state={state} />

      <div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-ember-500 px-7 py-3 text-sm font-semibold text-night-950 transition-colors hover:bg-ember-400 disabled:opacity-60"
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
        <DarkField label="Seu nome">
          <input name="name" required maxLength={120} className={inputClass} />
        </DarkField>
        <DarkField label="E-mail">
          <input name="email" type="email" required className={inputClass} />
        </DarkField>
      </div>
      <DarkField
        label={kind === "agencia" ? "Agência" : "Empresa (opcional)"}
      >
        <input name="company" maxLength={120} className={inputClass} />
      </DarkField>
      <DarkField
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
      </DarkField>

      <Feedback state={state} />

      <div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-ember-500 px-7 py-3 text-sm font-semibold text-night-950 transition-colors hover:bg-ember-400 disabled:opacity-60"
        >
          {pending ? "Enviando…" : "Enviar mensagem"}
        </button>
      </div>
    </form>
  );
}
