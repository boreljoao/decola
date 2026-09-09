/**
 * Validação de áudio por conteúdo real (spec §7.2/§16).
 * Mesma regra das imagens: o formato vem dos magic bytes, nunca do
 * content-type declarado pelo cliente. Módulo puro e testável.
 */

export const MAX_AUDIO_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_DURATION_SECONDS = 180; // 3 minutos por resposta

export type AudioMime = "audio/webm" | "audio/ogg" | "audio/mp4" | "audio/mpeg";

export interface AudioInfo {
  mime: AudioMime;
  extension: "webm" | "ogg" | "m4a" | "mp3";
}

export type AudioFailure =
  | "empty"
  | "too_large"
  | "too_long"
  | "unsupported_type";

export const AUDIO_MESSAGES: Record<AudioFailure, string> = {
  empty: "A gravação está vazia.",
  too_large: "A gravação precisa ter até 10 MB.",
  too_long: "A gravação precisa ter até 3 minutos.",
  unsupported_type:
    "Formato de áudio não suportado. Grave novamente pelo navegador.",
};

function startsWith(buf: Buffer, bytes: number[], offset = 0): boolean {
  if (buf.length < offset + bytes.length) return false;
  return bytes.every((b, i) => buf[offset + i] === b);
}

export function validateAudio(
  buf: Buffer,
  durationSeconds: number,
): { ok: true; info: AudioInfo } | { ok: false; reason: AudioFailure } {
  if (buf.length === 0) return { ok: false, reason: "empty" };
  if (buf.length > MAX_AUDIO_BYTES) return { ok: false, reason: "too_large" };
  if (durationSeconds > MAX_DURATION_SECONDS) {
    return { ok: false, reason: "too_long" };
  }

  // WebM/Matroska: EBML header 1A 45 DF A3
  if (startsWith(buf, [0x1a, 0x45, 0xdf, 0xa3])) {
    return { ok: true, info: { mime: "audio/webm", extension: "webm" } };
  }
  // Ogg: "OggS"
  if (startsWith(buf, [0x4f, 0x67, 0x67, 0x53])) {
    return { ok: true, info: { mime: "audio/ogg", extension: "ogg" } };
  }
  // MP4/M4A: box "ftyp" no offset 4
  if (
    buf.length > 12 &&
    buf.toString("ascii", 4, 8) === "ftyp"
  ) {
    return { ok: true, info: { mime: "audio/mp4", extension: "m4a" } };
  }
  // MP3: ID3 ou frame sync
  if (
    startsWith(buf, [0x49, 0x44, 0x33]) ||
    (buf.length > 2 && buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0)
  ) {
    return { ok: true, info: { mime: "audio/mpeg", extension: "mp3" } };
  }

  return { ok: false, reason: "unsupported_type" };
}
