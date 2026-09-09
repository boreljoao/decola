import "server-only";
import { env } from "@/config/env";

/**
 * Fronteira de transcrição (spec §2.2/§7.2).
 *
 * Estado: implementada, aguardando configuração. O adapter chama a API real de
 * transcrição da OpenAI (Whisper) por HTTP — sem SDK adicional — e é ativado
 * por `OPENAI_API_KEY`. Sem a chave, o áudio continua sendo gravado, guardado
 * e reproduzível, e a interface diz que a transcrição automática não está
 * disponível; a resposta por texto segue plenamente funcional.
 */

export type TranscriptionFailure =
  | "not_configured"
  | "provider_error"
  | "rate_limited"
  | "unsupported_audio";

export class TranscriptionError extends Error {
  constructor(
    public kind: TranscriptionFailure,
    message: string,
    public transient: boolean,
  ) {
    super(message);
    this.name = "TranscriptionError";
  }
}

export interface TranscriptionProvider {
  readonly kind: "openai";
  transcribe(input: {
    audio: Buffer;
    mimeType: string;
    filename: string;
  }): Promise<{ text: string }>;
}

class OpenAiTranscriptionProvider implements TranscriptionProvider {
  readonly kind = "openai" as const;

  constructor(private apiKey: string) {}

  async transcribe(input: {
    audio: Buffer;
    mimeType: string;
    filename: string;
  }): Promise<{ text: string }> {
    const form = new FormData();
    form.set(
      "file",
      new Blob([new Uint8Array(input.audio)], { type: input.mimeType }),
      input.filename,
    );
    form.set("model", "whisper-1");
    form.set("language", "pt");

    const response = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: { authorization: `Bearer ${this.apiKey}` },
        body: form,
        signal: AbortSignal.timeout(120_000),
      },
    );

    if (response.status === 429) {
      throw new TranscriptionError(
        "rate_limited",
        "Limite do provedor de transcrição atingido.",
        true,
      );
    }
    if (!response.ok) {
      throw new TranscriptionError(
        "provider_error",
        `Provedor de transcrição respondeu ${response.status}.`,
        response.status >= 500,
      );
    }

    const data = (await response.json()) as { text?: string };
    if (!data.text) {
      throw new TranscriptionError(
        "provider_error",
        "O provedor não devolveu texto.",
        false,
      );
    }
    return { text: data.text.trim() };
  }
}

export function transcriptionAvailable(): boolean {
  return Boolean(env().OPENAI_API_KEY);
}

export function getTranscriptionProvider(): TranscriptionProvider {
  const key = env().OPENAI_API_KEY;
  if (!key) {
    throw new TranscriptionError(
      "not_configured",
      "Transcrição automática indisponível: OPENAI_API_KEY não configurada.",
      false,
    );
  }
  return new OpenAiTranscriptionProvider(key);
}
