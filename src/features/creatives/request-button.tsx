"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { requestCreativesAction } from "./actions";

export function RequestCreativesButton({
  pageId,
  hasActiveSet,
}: {
  pageId: string;
  hasActiveSet: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Enquanto houver conjunto na fila/rodando, atualiza a lista.
  useEffect(() => {
    if (!hasActiveSet) return;
    const t = setInterval(() => router.refresh(), 2000);
    return () => clearInterval(t);
  }, [hasActiveSet, router]);

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        variant="commercial"
        disabled={pending || hasActiveSet}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await requestCreativesAction(pageId);
            if (!result.ok) setError(result.error ?? "Falha.");
            router.refresh();
          })
        }
      >
        {pending || hasActiveSet
          ? "Gerando propostas…"
          : "Gerar propostas de criativos ✦"}
      </Button>
      {error && (
        <p role="alert" className="text-sm font-medium text-danger-600">
          {error}
        </p>
      )}
    </div>
  );
}
