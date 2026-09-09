"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import {
  concludeExperimentAction,
  rollbackExperimentAction,
  startExperimentAction,
} from "./actions";

export function ExperimentActions({
  pageId,
  experimentId,
  mode,
}: {
  pageId: string;
  experimentId?: string;
  mode: "start" | "manage";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setMessage(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) setMessage(result.error ?? "Falha na operação.");
      router.refresh();
    });
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        {mode === "start" ? (
          <Button
            disabled={pending}
            onClick={() => run(() => startExperimentAction(pageId))}
          >
            {pending ? "Iniciando…" : "Iniciar teste"}
          </Button>
        ) : (
          <>
            <Button
              disabled={pending}
              onClick={() => run(() => concludeExperimentAction(experimentId!))}
            >
              {pending ? "Avaliando…" : "Avaliar e concluir"}
            </Button>
            <Button
              variant="danger"
              disabled={pending}
              onClick={() => run(() => rollbackExperimentAction(experimentId!))}
            >
              Reverter agora
            </Button>
          </>
        )}
      </div>
      {message && (
        <p role="alert" className="text-sm font-medium text-warning-600">
          {message}
        </p>
      )}
    </div>
  );
}
