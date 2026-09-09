"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import {
  buildIntegrationScript,
  externalScriptSrc,
  type IntegrationKind,
} from "@/features/integrations/definitions";

/**
 * Consentimento do visitante (spec §16).
 *
 * Regras aplicadas:
 * - Scripts opcionais ficam DESLIGADOS antes da escolha.
 * - Recusar é tão acessível quanto aceitar (mesmo peso visual, um clique).
 * - A escolha é registrada com a versão da política e pode ser alterada depois.
 * - A medição própria da Decola é first-party e sem cookies, então continua
 *   funcionando mesmo com recusa — e o banner diz isso.
 */

export const CONSENT_POLICY_VERSION = "2026-09-01";
const STORAGE_KEY = "decola_consent";

interface ConsentChoice {
  analytics: boolean;
  marketing: boolean;
  version: string;
}

/**
 * A escolha é lida por `useSyncExternalStore`: o snapshot é a string crua do
 * armazenamento (estável entre renders) e o servidor sempre devolve `null`,
 * então nada é renderizado até a hidratação decidir — sem flash de banner e
 * sem setState dentro de efeito.
 */
const listeners = new Set<() => void>();

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getSnapshot(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function getServerSnapshot(): string | null {
  return null;
}

function parseChoice(raw: string | null): ConsentChoice | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ConsentChoice;
    if (parsed.version !== CONSENT_POLICY_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function ConsentGate({
  integrations,
}: {
  integrations: Array<{ kind: IntegrationKind; id: string; category: "analytics" | "marketing" }>;
}) {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const choice = useMemo(() => parseChoice(raw), [raw]);
  // No servidor e antes da hidratação, `raw` é null e nada é decidido ainda;
  // o banner só aparece no cliente, quando sabemos que não há escolha salva.
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  // Carrega os scripts SOMENTE depois de um "sim" explícito da categoria.
  useEffect(() => {
    if (!choice) return;
    for (const integration of integrations) {
      const allowed =
        integration.category === "analytics" ? choice.analytics : choice.marketing;
      if (!allowed) continue;
      if (document.getElementById(`decola-int-${integration.kind}`)) continue;

      const src = externalScriptSrc(integration.kind, integration.id);
      if (src) {
        const external = document.createElement("script");
        external.src = src;
        external.async = true;
        document.head.appendChild(external);
      }
      const inline = buildIntegrationScript(integration.kind, integration.id);
      if (inline) {
        const script = document.createElement("script");
        script.id = `decola-int-${integration.kind}`;
        script.textContent = inline;
        document.head.appendChild(script);
      }
    }
  }, [choice, integrations]);

  const decide = useCallback((analytics: boolean, marketing: boolean) => {
    const next: ConsentChoice = {
      analytics,
      marketing,
      version: CONSENT_POLICY_VERSION,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* navegador sem armazenamento: a escolha vale para esta visita */
    }
    // Notifica o store para re-renderizar com a escolha nova.
    for (const listener of listeners) listener();
  }, []);

  if (integrations.length === 0 || !hydrated || choice !== null) return null;

  return (
    <div
      role="dialog"
      aria-label="Preferências de cookies"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-2xl rounded-2xl border border-current/15 bg-[var(--lp-surface)] p-5 shadow-2xl"
    >
      <p className="text-sm font-semibold">Sobre cookies nesta página</p>
      <p className="mt-2 text-sm leading-relaxed text-[var(--lp-muted)]">
        Este site usa ferramentas de medição de terceiros. Você escolhe se quer
        permitir. A contagem básica de visitas da Decola é feita sem cookies e
        sem identificar você — ela funciona de qualquer forma.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => decide(true, true)}
          className="rounded-xl bg-[var(--lp-primary)] px-5 py-2.5 text-sm font-semibold text-[var(--lp-primary-contrast)]"
        >
          Aceitar
        </button>
        <button
          type="button"
          onClick={() => decide(false, false)}
          className="rounded-xl border border-current/25 px-5 py-2.5 text-sm font-semibold"
        >
          Recusar
        </button>
      </div>
    </div>
  );
}
