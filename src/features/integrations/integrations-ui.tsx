"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import { Button, Field, Input } from "@/components/ui";
import {
  connectIntegrationAction,
  disconnectIntegrationAction,
  type IntegrationActionResult,
} from "./actions";

export function IntegrationCard({
  kind,
  label,
  placeholder,
  help,
  available,
  unavailableReason,
  currentValue,
}: {
  kind: string;
  label: string;
  placeholder: string;
  help: string;
  available: boolean;
  unavailableReason?: string;
  currentValue?: string;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<
    IntegrationActionResult,
    FormData
  >(connectIntegrationAction, { ok: false });
  const [removing, startRemoving] = useTransition();
  const [removeError, setRemoveError] = useState<string | null>(null);

  if (!available) {
    return (
      <p className="rounded-xl bg-warning-600/10 px-4 py-3 text-sm text-warning-600">
        {unavailableReason}
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      <form action={action} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <input type="hidden" name="kind" value={kind} />
        <Field label={label} hint={help}>
          <Input
            name="value"
            defaultValue={currentValue}
            placeholder={placeholder}
            required
          />
        </Field>
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : currentValue ? "Atualizar" : "Conectar"}
        </Button>
        {state.error && (
          <p role="alert" className="text-sm font-medium text-danger-600 sm:col-span-2">
            {state.error}
          </p>
        )}
        {state.ok && (
          <p className="text-sm font-medium text-success-600 sm:col-span-2">
            Integração salva.
          </p>
        )}
      </form>

      {currentValue && (
        <div>
          <button
            type="button"
            disabled={removing}
            onClick={() =>
              startRemoving(async () => {
                setRemoveError(null);
                const result = await disconnectIntegrationAction(kind);
                if (!result.ok) setRemoveError(result.error ?? "Falha.");
                router.refresh();
              })
            }
            className="text-xs font-semibold text-danger-600 hover:underline disabled:opacity-40"
          >
            Desconectar
          </button>
          {removeError && (
            <p role="alert" className="mt-1 text-xs text-danger-600">
              {removeError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
