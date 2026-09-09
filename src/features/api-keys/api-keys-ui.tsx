"use client";

import { useRouter } from "next/navigation";
import { useActionState, useTransition } from "react";
import { Badge, Button, Field, Input } from "@/components/ui";
import {
  createApiKeyAction,
  revokeApiKeyAction,
  type ApiKeyActionResult,
} from "./actions";
import { API_SCOPES, SCOPE_LABELS, type ApiScope } from "./scopes";

export interface ApiKeyView {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt: string | null;
  revoked: boolean;
}

export function ApiKeyManager({
  keys,
  apiAllowed,
  planName,
}: {
  keys: ApiKeyView[];
  apiAllowed: boolean;
  planName: string;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<ApiKeyActionResult, FormData>(
    createApiKeyAction,
    { ok: false },
  );
  const [revoking, startRevoking] = useTransition();

  if (!apiAllowed) {
    return (
      <p className="rounded-xl bg-warning-600/10 px-4 py-3 text-sm text-warning-600">
        A API de integração faz parte do plano Business. Seu plano atual é{" "}
        {planName}.
      </p>
    );
  }

  return (
    <div className="grid gap-5">
      {keys.length > 0 && (
        <ul className="grid gap-2">
          {keys.map((key) => (
            <li
              key={key.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-900/10 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{key.name}</p>
                <p className="font-mono text-xs text-ink-600">
                  {key.prefix}··· · {key.scopes.join(", ")}
                </p>
                <p className="text-xs text-ink-600">
                  Criada em {key.createdAt}
                  {key.lastUsedAt ? ` · usada em ${key.lastUsedAt}` : " · nunca usada"}
                </p>
              </div>
              {key.revoked ? (
                <Badge tone="neutral">revogada</Badge>
              ) : (
                <button
                  type="button"
                  disabled={revoking}
                  onClick={() =>
                    startRevoking(async () => {
                      await revokeApiKeyAction(key.id);
                      router.refresh();
                    })
                  }
                  className="text-xs font-semibold text-danger-600 hover:underline disabled:opacity-40"
                >
                  Revogar
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {state.secret && (
        <div className="grid gap-2 rounded-xl border border-success-600/40 bg-success-600/5 p-4">
          <p className="text-sm font-semibold text-success-600">
            Chave criada. Copie agora — ela não será exibida novamente.
          </p>
          <code className="block break-all rounded-lg bg-ink-900/5 p-3 font-mono text-xs">
            {state.secret}
          </code>
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(state.secret!)}
            className="justify-self-start text-xs font-semibold text-electric-600 hover:underline"
          >
            Copiar chave
          </button>
        </div>
      )}

      <form action={action} className="grid gap-4">
        <Field label="Nome da chave" hint="Para você reconhecer onde ela é usada.">
          <Input name="name" required minLength={2} maxLength={60} placeholder="Ex.: CRM da agência" />
        </Field>
        <fieldset className="grid gap-2">
          <legend className="text-sm font-medium">Escopos</legend>
          {API_SCOPES.map((scope: ApiScope) => (
            <label key={scope} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="scopes" value={scope} />
              <span>
                {SCOPE_LABELS[scope]}{" "}
                <code className="font-mono text-xs text-ink-600">{scope}</code>
              </span>
            </label>
          ))}
        </fieldset>
        {state.error && (
          <p role="alert" className="text-sm font-medium text-danger-600">
            {state.error}
          </p>
        )}
        <div>
          <Button type="submit" disabled={pending}>
            {pending ? "Criando…" : "Criar chave"}
          </Button>
        </div>
      </form>
    </div>
  );
}
