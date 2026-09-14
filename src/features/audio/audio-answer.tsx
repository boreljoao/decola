"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button, cx } from "@/components/ui";

import { MAX_AUDIO_BYTES, UPLOAD_LIMIT_LABEL } from "@/features/assets/upload-limits";
/**
 * Resposta por áudio (spec §7.2).
 *
 * Regras aplicadas:
 * - o microfone só é acessado depois de o usuário pedir para gravar;
 * - gravar / parar / ouvir / descartar, com limite de duração configurado;
 * - transcrição assíncrona e **revisão antes de aceitar** — o texto nunca
 *   entra na resposta sem o usuário confirmar;
 * - permissão negada ou falha mantém a digitação plenamente funcional.
 */

const MAX_SECONDS = 180;

type Phase = "idle" | "recording" | "uploading" | "ready" | "denied" | "error";

interface RecordingState {
  id: string;
  url: string;
  status: string;
  transcriptionAvailable: boolean;
}

export function AudioAnswer({
  projectId,
  questionId,
  onAcceptTranscript,
}: {
  projectId: string;
  questionId: string;
  onAcceptTranscript: (text: string) => void;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [seconds, setSeconds] = useState(0);
  const [recording, setRecording] = useState<RecordingState | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAt = useRef<number>(0);

  const cleanupStream = useCallback(() => {
    mediaRecorder.current?.stream.getTracks().forEach((t) => t.stop());
    mediaRecorder.current = null;
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  }, []);

  useEffect(() => cleanupStream, [cleanupStream]);

  const upload = useCallback(
    async (blob: Blob, durationSeconds: number) => {
      if (blob.size > MAX_AUDIO_BYTES) {
        setPhase("error");
        setMessage(
          `A gravação passou de ${UPLOAD_LIMIT_LABEL}. Grave uma resposta mais curta.`,
        );
        return;
      }
      setPhase("uploading");
      setMessage(null);
      try {
        const form = new FormData();
        form.set("audio", blob, "resposta.webm");
        form.set("projectId", projectId);
        form.set("questionId", questionId);
        form.set("durationSeconds", String(Math.max(1, durationSeconds)));

        const res = await fetch("/api/audio/upload", {
          method: "POST",
          body: form,
        });
        if (res.status === 413) {
          // Recusado pela plataforma antes do nosso código: a resposta nem é JSON.
          throw new Error(`A gravação precisa ter até ${UPLOAD_LIMIT_LABEL}.`);
        }
        const json = (await res.json()) as {
          ok: boolean;
          message?: string;
          recording?: RecordingState;
        };
        if (!res.ok || !json.ok || !json.recording) {
          throw new Error(json.message ?? "Falha ao enviar a gravação.");
        }
        setRecording(json.recording);
        setPhase("ready");
        if (!json.recording.transcriptionAvailable) {
          setMessage(
            "Gravação salva. A transcrição automática não está ativa neste ambiente — ouça o áudio e escreva a resposta ao lado.",
          );
        }
      } catch (err) {
        setPhase("error");
        setMessage(
          err instanceof Error ? err.message : "Falha ao enviar a gravação.",
        );
      }
    },
    [projectId, questionId],
  );

  const stop = useCallback(() => {
    if (mediaRecorder.current?.state === "recording") {
      mediaRecorder.current.stop();
    }
  }, []);

  async function start() {
    setMessage(null);
    setTranscript(null);
    try {
      // O microfone só é pedido aqui, no clique explícito do usuário.
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorder.current = recorder;
      chunks.current = [];
      startedAt.current = Date.now();

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };
      recorder.onstop = () => {
        const elapsed = Math.round((Date.now() - startedAt.current) / 1000);
        cleanupStream();
        const blob = new Blob(chunks.current, {
          type: recorder.mimeType || "audio/webm",
        });
        void upload(blob, elapsed);
      };

      recorder.start();
      setPhase("recording");
      setSeconds(0);
      timer.current = setInterval(() => {
        setSeconds((current) => {
          const next = current + 1;
          if (next >= MAX_SECONDS) stop();
          return next;
        });
      }, 1000);
    } catch {
      setPhase("denied");
      setMessage(
        "Não conseguimos acessar seu microfone. Você pode responder digitando normalmente.",
      );
    }
  }

  /** Consulta a transcrição pronta (job assíncrono). */
  async function checkTranscript() {
    if (!recording) return;
    setMessage(null);
    try {
      const res = await fetch(`/api/audio/status/${recording.id}`);
      const json = (await res.json()) as {
        status: string;
        transcript?: string | null;
        error?: string | null;
      };
      if (json.status === "completed" && json.transcript) {
        setTranscript(json.transcript);
      } else if (json.status === "failed" || json.status === "unavailable") {
        setMessage(
          json.error ??
            "A transcrição não ficou disponível. Ouça a gravação e escreva a resposta.",
        );
      } else {
        setMessage("A transcrição ainda está sendo processada. Tente em instantes.");
      }
    } catch {
      setMessage("Não foi possível consultar a transcrição agora.");
    }
  }

  async function discard() {
    if (recording) {
      await fetch(
        `/api/audio/upload?projectId=${projectId}&questionId=${questionId}`,
        { method: "DELETE" },
      ).catch(() => {});
    }
    setRecording(null);
    setTranscript(null);
    setPhase("idle");
    setMessage(null);
  }

  return (
    <div className="grid gap-3 rounded-xl border border-ink-900/10 bg-paper p-4">
      <div className="flex flex-wrap items-center gap-3">
        {phase === "recording" ? (
          <>
            <Button variant="danger" onClick={stop}>
              ⏹ Parar gravação
            </Button>
            <span
              className="tabular flex items-center gap-2 text-sm font-medium text-danger-600"
              role="status"
            >
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-danger-600" />
              {String(Math.floor(seconds / 60)).padStart(2, "0")}:
              {String(seconds % 60).padStart(2, "0")} / 03:00
            </span>
          </>
        ) : (
          <Button
            variant="secondary"
            onClick={start}
            disabled={phase === "uploading"}
          >
            {phase === "uploading"
              ? "Enviando…"
              : recording
                ? "🎙 Gravar de novo"
                : "🎙 Responder falando"}
          </Button>
        )}

        {recording && phase !== "recording" && (
          <Button variant="ghost" onClick={discard}>
            Descartar áudio
          </Button>
        )}
      </div>

      {recording && (
        <div className="grid gap-3">
          <audio
            controls
            src={recording.url}
            className="w-full"
            aria-label="Sua gravação"
          />

          {recording.transcriptionAvailable && !transcript && (
            <Button variant="secondary" onClick={checkTranscript}>
              Ver transcrição
            </Button>
          )}

          {transcript && (
            <div className="grid gap-2 rounded-lg border border-electric-600/30 bg-electric-600/5 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-electric-600">
                Transcrição — revise antes de usar
              </p>
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                rows={4}
                aria-label="Transcrição da sua gravação"
                className="w-full rounded-lg border border-ink-900/15 bg-white p-2.5 text-sm"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => {
                    onAcceptTranscript(transcript);
                    setMessage("Transcrição aplicada na resposta.");
                  }}
                >
                  Usar este texto
                </Button>
                <Button variant="ghost" onClick={() => setTranscript(null)}>
                  Não usar
                </Button>
              </div>
              <p className="text-xs text-ink-600">
                Nada é usado sem a sua confirmação — a transcrição é uma
                sugestão que você revisa.
              </p>
            </div>
          )}
        </div>
      )}

      {message && (
        <p
          className={cx(
            "text-sm",
            phase === "error" || phase === "denied"
              ? "font-medium text-warning-600"
              : "text-ink-600",
          )}
        >
          {message}
        </p>
      )}

      <p className="text-xs text-ink-600">
        A gravação fica privada na sua conta, é usada só para gerar a sua página
        e é apagada automaticamente em 30 dias. Você pode excluí-la a qualquer
        momento.
      </p>
    </div>
  );
}
