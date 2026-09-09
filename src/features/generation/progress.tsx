"use client";

import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";
import { Button, cx } from "@/components/ui";
import { retryGenerationAction } from "./actions";

/**
 * Progresso da geração com etapas reais (spec §7.3): sem porcentagens
 * inventadas — cada linha reflete o estado persistido em generation_steps.
 */

export interface StepView {
  step: string;
  label: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
}

export function GenerationProgress({
  projectId,
  jobStatus,
  steps,
  error,
}: {
  projectId: string;
  jobStatus: "queued" | "running" | "completed" | "failed" | "canceled";
  steps: StepView[];
  error?: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const active = jobStatus === "queued" || jobStatus === "running";

  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => router.refresh(), 2000);
    return () => clearInterval(t);
  }, [active, router]);

  return (
    <div className="mx-auto max-w-xl">
      <ol className="grid gap-3">
        {steps.map((s) => (
          <li
            key={s.step}
            className={cx(
              "flex items-center gap-3 rounded-xl border px-4 py-3.5 text-sm font-medium",
              s.status === "completed" && "border-success-600/30 bg-success-600/5",
              s.status === "running" && "border-electric-600/40 bg-electric-600/5",
              s.status === "failed" && "border-danger-600/40 bg-danger-600/5",
              (s.status === "pending" || s.status === "skipped") &&
                "border-ink-900/10 bg-paper text-ink-600",
            )}
          >
            <StepIcon status={s.status} />
            {s.label}
          </li>
        ))}
      </ol>

      {jobStatus === "failed" && (
        <div className="mt-6 rounded-xl border border-danger-600/30 bg-danger-600/5 p-5">
          <p className="text-sm font-semibold text-danger-600">
            A geração falhou.
          </p>
          {error && <p className="mt-1 text-sm text-ink-600">{error}</p>}
          <Button
            className="mt-4"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await retryGenerationAction(projectId);
                router.refresh();
              })
            }
          >
            {pending ? "Reprocessando…" : "Tentar novamente"}
          </Button>
        </div>
      )}

      {jobStatus === "completed" && (
        <div className="mt-8 text-center">
          <p
            style={{ fontFamily: "var(--font-sora)" }}
            className="text-xl font-bold"
          >
            Sua página está pronta ✦
          </p>
          <Button
            variant="commercial"
            className="mt-4"
            onClick={() => router.push(`/app/paginas/${projectId}/preview`)}
          >
            Ver minha página
          </Button>
        </div>
      )}

      {active && (
        <p className="mt-6 text-center text-sm text-ink-600">
          Você pode sair desta tela — a geração continua no servidor e estará
          aqui quando voltar.
        </p>
      )}
    </div>
  );
}

function StepIcon({ status }: { status: StepView["status"] }) {
  if (status === "completed")
    return (
      <span aria-hidden="true" className="text-success-600">
        ✓
      </span>
    );
  if (status === "running")
    return (
      <span
        aria-hidden="true"
        className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-electric-600 border-t-transparent"
      />
    );
  if (status === "failed")
    return (
      <span aria-hidden="true" className="text-danger-600">
        ✕
      </span>
    );
  return (
    <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full bg-ink-400" />
  );
}
