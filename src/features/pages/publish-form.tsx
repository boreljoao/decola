"use client";

import { useActionState } from "react";
import { Button, Field, Input } from "@/components/ui";
import {
  publishPageAction,
  unpublishPageAction,
  type PublishState,
} from "./actions";

export function PublishForm({
  pageId,
  currentSlug,
  addressPrefix,
  addressSuffix,
  isLive,
}: {
  pageId: string;
  currentSlug: string | null;
  /** Parte fixa antes do endereço (modo por caminho: `host/p/`). */
  addressPrefix: string;
  /** Parte fixa depois do endereço (modo subdomínio: `.dominio`). */
  addressSuffix: string;
  isLive: boolean;
}) {
  const [state, action, pending] = useActionState<PublishState, FormData>(
    publishPageAction,
    {},
  );
  const [unpubState, unpubAction, unpubPending] = useActionState<
    PublishState,
    FormData
  >(unpublishPageAction, {});

  return (
    <div className="grid gap-6">
      <form action={action} className="grid gap-4">
        <input type="hidden" name="pageId" value={pageId} />
        <Field
          label="Endereço da sua página"
          hint={`Sua página ficará em https://${addressPrefix}SEU-ENDERECO${addressSuffix}`}
        >
          <div className="flex flex-wrap items-center gap-2">
            {addressPrefix && (
              <span className="text-sm text-ink-600">{addressPrefix}</span>
            )}
            <Input
              name="slug"
              defaultValue={currentSlug ?? ""}
              placeholder="meu-negocio"
              pattern="[a-z0-9][a-z0-9-]{1,38}[a-z0-9]"
              className="min-w-[10rem] flex-1"
              required={!currentSlug}
            />
            {addressSuffix && (
              <span className="text-sm text-ink-600">{addressSuffix}</span>
            )}
          </div>
        </Field>
        {state.error && (
          <p role="alert" className="text-sm font-medium text-danger-600">
            {state.error}
          </p>
        )}
        {state.ok && state.url && (
          <p className="rounded-xl bg-success-600/10 px-4 py-3 text-sm font-medium text-success-600">
            Página no ar! Endereço:{" "}
            <a
              href={state.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              {state.url}
            </a>
          </p>
        )}
        <div>
          <Button type="submit" variant="commercial" disabled={pending}>
            {pending
              ? "Publicando…"
              : isLive
                ? "Republicar versão atual"
                : "Decolar agora ✦"}
          </Button>
        </div>
      </form>

      {isLive && (
        <form action={unpubAction} className="border-t border-ink-900/10 pt-4">
          <input type="hidden" name="pageId" value={pageId} />
          {unpubState.error && (
            <p role="alert" className="mb-2 text-sm font-medium text-danger-600">
              {unpubState.error}
            </p>
          )}
          <Button type="submit" variant="danger" disabled={unpubPending}>
            {unpubPending ? "Despublicando…" : "Despublicar página"}
          </Button>
        </form>
      )}
    </div>
  );
}
