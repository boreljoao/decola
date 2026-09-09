"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import { Button, Field, Input, Select } from "@/components/ui";
import {
  inviteMemberAction,
  removeMemberAction,
  revokeInviteAction,
  type TeamActionResult,
} from "./actions";

export function InviteForm({ seatsAvailable }: { seatsAvailable: number }) {
  const [state, action, pending] = useActionState<TeamActionResult, FormData>(
    inviteMemberAction,
    { ok: false },
  );

  if (seatsAvailable <= 0) {
    return (
      <p className="rounded-xl bg-warning-600/10 px-4 py-3 text-sm text-warning-600">
        Todos os assentos do seu plano estão ocupados. Remova um membro ou faça
        upgrade para convidar mais pessoas.
      </p>
    );
  }

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
      <Field label="E-mail">
        <Input name="email" type="email" required placeholder="pessoa@exemplo.com.br" />
      </Field>
      <Field label="Papel">
        <Select name="role" defaultValue="editor">
          <option value="admin">Administrador</option>
          <option value="editor">Editor</option>
          <option value="viewer">Visualizador</option>
        </Select>
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Enviando…" : "Convidar"}
      </Button>

      {state.error && (
        <p role="alert" className="text-sm font-medium text-danger-600 sm:col-span-3">
          {state.error}
        </p>
      )}
      {state.ok && (
        <div className="text-sm text-success-600 sm:col-span-3">
          <p>Convite enviado.</p>
          {state.inviteUrl && (
            <p className="mt-1 break-all text-xs text-ink-600">
              Ambiente de desenvolvimento (sem envio real de e-mail) — link do
              convite: {state.inviteUrl}
            </p>
          )}
        </div>
      )}
    </form>
  );
}

export function MemberActions({
  profileId,
  invitationId,
}: {
  profileId?: string;
  invitationId?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="grid justify-items-end">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = invitationId
              ? await revokeInviteAction(invitationId)
              : await removeMemberAction(profileId!);
            if (!result.ok) setError(result.error ?? "Falha.");
            router.refresh();
          })
        }
        className="text-xs font-semibold text-danger-600 hover:underline disabled:opacity-40"
      >
        {invitationId ? "Revogar" : "Remover"}
      </button>
      {error && (
        <p role="alert" className="mt-1 max-w-xs text-right text-xs text-danger-600">
          {error}
        </p>
      )}
    </div>
  );
}
