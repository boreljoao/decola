import "server-only";
import { eq, lt } from "drizzle-orm";
import { getDb } from "@/server/db";
import { audioRecordings } from "@/server/db/schema";
import { getStorageProvider } from "@/server/storage";
import {
  getTranscriptionProvider,
  TranscriptionError,
} from "./transcription-provider";

/** Handler do job "transcribe_audio" — idempotente por gravação. */
export async function processTranscription(
  payload: Record<string, unknown>,
): Promise<void> {
  const recordingId = String(payload.recordingId ?? "");
  if (!recordingId) throw new Error("payload.recordingId ausente");

  const db = await getDb();
  const recording = await db.query.audioRecordings.findFirst({
    where: eq(audioRecordings.id, recordingId),
  });
  if (!recording) return; // gravação apagada pelo usuário: nada a fazer
  if (recording.status === "completed") return;

  await db
    .update(audioRecordings)
    .set({ status: "processing", error: null })
    .where(eq(audioRecordings.id, recordingId));

  try {
    const provider = getTranscriptionProvider();
    const audio = await getStorageProvider().get(recording.storageKey);
    const extension = recording.storageKey.split(".").pop() ?? "webm";

    const result = await provider.transcribe({
      audio,
      mimeType: recording.mimeType,
      filename: `resposta.${extension}`,
    });

    await db
      .update(audioRecordings)
      .set({
        status: "completed",
        transcript: result.text,
        transcribedAt: new Date(),
        error: null,
      })
      .where(eq(audioRecordings.id, recordingId));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const notConfigured =
      err instanceof TranscriptionError && err.kind === "not_configured";
    const transient =
      err instanceof TranscriptionError ? err.transient : true;

    await db
      .update(audioRecordings)
      .set({
        status: notConfigured ? "unavailable" : "failed",
        error: message.slice(0, 500),
      })
      .where(eq(audioRecordings.id, recordingId));

    // Falta de configuração não é falha recuperável: não retentar.
    if (!notConfigured && transient) throw err;
  }
}

/**
 * Limpeza de gravações vencidas (spec §7.2: definir expiração do áudio).
 * Roda pelo worker junto com o drain.
 */
export async function purgeExpiredAudio(): Promise<number> {
  const db = await getDb();
  const expired = await db.query.audioRecordings.findMany({
    where: lt(audioRecordings.expiresAt, new Date()),
  });

  const storage = getStorageProvider();
  for (const recording of expired) {
    await storage.delete(recording.storageKey);
    await db
      .delete(audioRecordings)
      .where(eq(audioRecordings.id, recording.id));
  }
  return expired.length;
}
