"use client";

import { useActionState } from "react";
import { Button, Input } from "@/components/ui";
import { reviewApplicationAction, type ReviewResult } from "./admin-actions";

export function ApplicationReview({
  applicationId,
  hasAccount,
}: {
  applicationId: string;
  hasAccount: boolean;
}) {
  const [state, action, pending] = useActionState<ReviewResult, FormData>(
    reviewApplicationAction,
    { ok: false },
  );

  return (
    <form action={action} className="grid gap-3 border-t border-ink-900/10 pt-4">
      <input type="hidden" name="applicationId" value={applicationId} />

      {!hasAccount && (
        <p className="rounded-lg bg-warning-600/10 px-3 py-2 text-xs text-warning-600">
          Esta candidatura não veio de uma conta logada. A aprovação só funciona
          se existir uma conta Decola com o mesmo e-mail.
        </p>
      )}

      <Input
        name="note"
        placeholder="Observação (opcional, enviada no e-mail de recusa)"
        maxLength={500}
      />

      {state.error && (
        <p role="alert" className="text-sm font-medium text-danger-600">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="text-sm font-medium text-success-600">
          Decisão registrada e candidato avisado.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          name="decision"
          value="approve"
          disabled={pending}
          className="bg-success-600 text-white hover:bg-success-600/90"
        >
          {pending ? "Processando…" : "Aprovar e publicar perfil"}
        </Button>
        <Button type="submit" name="decision" value="reject" variant="danger" disabled={pending}>
          Recusar
        </Button>
      </div>
    </form>
  );
}
