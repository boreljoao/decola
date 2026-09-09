"use client";

import { useRef, useState } from "react";
import { Button, cx } from "@/components/ui";
import type { ImageRef } from "@/features/generation/page-document";

/**
 * Upload de imagem com feedback de estado (spec §5.3: padrão, carregando,
 * erro). A validação real acontece no servidor — aqui só há conveniência.
 */

export function ImageUploadField({
  projectId,
  kind = "image",
  value,
  onChange,
  label,
  hint,
  previewClassName,
}: {
  projectId: string;
  kind?: "logo" | "image";
  value?: ImageRef;
  onChange: (image: ImageRef | undefined) => void;
  label: string;
  hint?: string;
  previewClassName?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<"idle" | "uploading" | "error">("idle");
  const [error, setError] = useState<string>("");

  async function upload(file: File) {
    setState("uploading");
    setError("");
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("projectId", projectId);
      form.set("kind", kind);
      const res = await fetch("/api/assets/upload", {
        method: "POST",
        body: form,
      });
      const json = (await res.json()) as {
        ok: boolean;
        message?: string;
        asset?: { id: string; width: number; height: number; alt: string };
      };
      if (!res.ok || !json.ok || !json.asset) {
        throw new Error(json.message ?? "Falha ao enviar a imagem.");
      }
      onChange({
        assetId: json.asset.id,
        alt: value?.alt ?? "",
        width: json.asset.width,
        height: json.asset.height,
      });
      setState("idle");
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Falha ao enviar a imagem.");
    }
  }

  return (
    <div className="grid gap-2">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="text-xs text-ink-600">{hint}</p>}
      </div>

      {value ? (
        <div className="grid gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/assets/${value.assetId}`}
            alt={value.alt || "Pré-visualização da imagem enviada"}
            className={cx(
              "rounded-xl border border-ink-900/10 bg-paper object-contain",
              previewClassName ?? "max-h-40 w-full",
            )}
          />
          <label className="grid gap-1 text-xs font-medium">
            Texto alternativo (acessibilidade)
            <input
              value={value.alt}
              onChange={(e) => onChange({ ...value, alt: e.target.value })}
              placeholder="Descreva a imagem para quem não pode vê-la"
              maxLength={200}
              className="rounded-lg border border-ink-900/15 bg-white px-3 py-2 text-sm"
            />
          </label>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => inputRef.current?.click()}
              disabled={state === "uploading"}
            >
              Trocar imagem
            </Button>
            <Button variant="ghost" onClick={() => onChange(undefined)}>
              Remover
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="secondary"
          onClick={() => inputRef.current?.click()}
          disabled={state === "uploading"}
        >
          {state === "uploading" ? "Enviando…" : "Escolher imagem"}
        </Button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
          e.target.value = "";
        }}
      />
      <p className="text-xs text-ink-600">
        PNG, JPEG ou WebP, até 5 MB. Dados de localização (EXIF) são removidos.
      </p>
      {state === "error" && (
        <p role="alert" className="text-sm font-medium text-danger-600">
          {error}
        </p>
      )}
    </div>
  );
}
