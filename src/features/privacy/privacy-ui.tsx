"use client";

import { useActionState, useState, useTransition } from "react";
import { Button, Input } from "@/components/ui";
import { deleteMyAccountAction, exportMyDataAction } from "./actions";

export function ExportDataButton() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  return (
    <div className="grid gap-2">
      <div>
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              setDone(false);
              const result = await exportMyDataAction();
              if (!result.ok || !result.json) {
                setError(result.error ?? "Falha ao exportar.");
                return;
              }
              // O download é iniciado no navegador, sem passar por servidor
              // de arquivos: o conteúdo já está na resposta da ação.
              const blob = new Blob([result.json], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = `decola-meus-dados-${new Date()
                .toISOString()
                .slice(0, 10)}.json`;
              document.body.appendChild(link);
              link.click();
              link.remove();
              URL.revokeObjectURL(url);
              setDone(true);
            })
          }
        >
          {pending ? "Preparando…" : "Baixar meus dados (JSON)"}
        </Button>
      </div>
      {done && (
        <p className="text-sm font-medium text-success-600">
          Exportação gerada e baixada.
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm font-medium text-danger-600">
          {error}
        </p>
      )}
    </div>
  );
}

export function DangerZone({ email }: { email: string }) {
  const [confirming, setConfirming] = useState(false);
  const [state, action, pending] = useActionState<{ error?: string }, FormData>(
    deleteMyAccountAction,
    {},
  );

  if (!confirming) {
    return (
      <Button variant="danger" onClick={() => setConfirming(true)}>
        Quero excluir minha conta
      </Button>
    );
  }

  return (
    <form action={action} className="grid gap-3">
      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">
          Para confirmar, digite <strong>{email}</strong>
        </span>
        <Input name="confirmacao" required autoComplete="off" />
      </label>
      {state.error && (
        <p role="alert" className="text-sm font-medium text-danger-600">
          {state.error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" variant="danger" disabled={pending}>
          {pending ? "Excluindo…" : "Excluir definitivamente"}
        </Button>
        <Button variant="ghost" onClick={() => setConfirming(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
