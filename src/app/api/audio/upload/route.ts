import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { after } from "next/server";
import { z } from "zod";
import {
  AUDIO_MESSAGES,
  MAX_AUDIO_BYTES,
  validateAudio,
} from "@/features/audio/validate-audio";
import { transcriptionAvailable } from "@/features/audio/transcription-provider";
import { QUESTIONS } from "@/features/briefing/questions";
import { assertRole, requireWorkspace } from "@/server/auth";
import { getDb } from "@/server/db";
import { audioRecordings, projects } from "@/server/db/schema";
import { enqueueJob, kickDrain } from "@/server/jobs";
import { registerAllJobHandlers } from "@/server/jobs/handlers";
import { rateLimit } from "@/server/security/rate-limit";
import { getStorageProvider } from "@/server/storage";

/**
 * Upload de áudio de resposta do briefing (spec §7.2).
 * Formato validado por conteúdo real, limite de tamanho e duração, arquivo
 * privado com expiração e transcrição assíncrona pela fila.
 */

export const dynamic = "force-dynamic";

/** Áudio guardado por 30 dias; depois disso é removido pelo worker. */
const RETENTION_DAYS = 30;

const metaSchema = z.object({
  projectId: z.string().uuid(),
  questionId: z.string().min(1).max(80),
  durationSeconds: z.number().int().min(1).max(600),
});

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Envio inválido." },
      { status: 400 },
    );
  }

  const parsed = metaSchema.safeParse({
    projectId: form.get("projectId"),
    questionId: form.get("questionId"),
    durationSeconds: Number(form.get("durationSeconds") ?? 0),
  });
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Dados da gravação inválidos." },
      { status: 400 },
    );
  }

  // Só perguntas conhecidas do contrato (anti mass-assignment).
  if (!QUESTIONS.some((q) => q.id === parsed.data.questionId)) {
    return NextResponse.json(
      { ok: false, message: "Pergunta desconhecida." },
      { status: 400 },
    );
  }

  const file = form.get("audio");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { ok: false, message: "Envie a gravação." },
      { status: 400 },
    );
  }
  if (file.size > MAX_AUDIO_BYTES) {
    return NextResponse.json(
      { ok: false, message: AUDIO_MESSAGES.too_large },
      { status: 413 },
    );
  }

  const db = await getDb();
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, parsed.data.projectId),
  });
  if (!project) {
    return NextResponse.json(
      { ok: false, message: "Projeto não encontrado." },
      { status: 404 },
    );
  }

  let ctx;
  try {
    ctx = await requireWorkspace(project.workspaceId);
    assertRole(ctx, "editor");
  } catch {
    return NextResponse.json(
      { ok: false, message: "Sem permissão." },
      { status: 403 },
    );
  }

  if (!rateLimit(`audio:${ctx.workspaceId}`, 30, 60_000).allowed) {
    return NextResponse.json(
      { ok: false, message: "Muitas gravações seguidas. Aguarde um instante." },
      { status: 429 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const validation = validateAudio(buffer, parsed.data.durationSeconds);
  if (!validation.ok) {
    return NextResponse.json(
      { ok: false, message: AUDIO_MESSAGES[validation.reason] },
      { status: 415 },
    );
  }

  const id = crypto.randomUUID();
  const storageKey = `workspaces/${ctx.workspaceId}/audio/${id}.${validation.info.extension}`;

  try {
    await getStorageProvider().put({
      key: storageKey,
      body: buffer,
      contentType: validation.info.mime,
    });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Falha ao guardar a gravação." },
      { status: 503 },
    );
  }

  const willTranscribe = transcriptionAvailable();

  // Regravar substitui o áudio anterior daquela pergunta.
  const [recording] = await db
    .insert(audioRecordings)
    .values({
      id,
      workspaceId: ctx.workspaceId,
      projectId: project.id,
      questionId: parsed.data.questionId,
      storageKey,
      mimeType: validation.info.mime,
      bytes: buffer.byteLength,
      durationSeconds: parsed.data.durationSeconds,
      status: willTranscribe ? "pending" : "unavailable",
      error: willTranscribe
        ? null
        : "Transcrição automática não configurada neste ambiente.",
      expiresAt: new Date(Date.now() + RETENTION_DAYS * 24 * 3600 * 1000),
      createdBy: ctx.user.profileId,
    })
    .onConflictDoUpdate({
      target: [audioRecordings.projectId, audioRecordings.questionId],
      set: {
        id,
        storageKey,
        mimeType: validation.info.mime,
        bytes: buffer.byteLength,
        durationSeconds: parsed.data.durationSeconds,
        status: willTranscribe ? "pending" : "unavailable",
        transcript: null,
        error: willTranscribe
          ? null
          : "Transcrição automática não configurada neste ambiente.",
        expiresAt: new Date(Date.now() + RETENTION_DAYS * 24 * 3600 * 1000),
        createdAt: new Date(),
        transcribedAt: null,
      },
    })
    .returning();

  if (willTranscribe) {
    registerAllJobHandlers();
    await enqueueJob({
      type: "transcribe_audio",
      payload: { recordingId: recording.id },
      dedupKey: `transcribe:${recording.id}`,
    });
    after(() => kickDrain());
  }

  return NextResponse.json({
    ok: true,
    recording: {
      id: recording.id,
      url: `/api/audio/${recording.id}`,
      status: recording.status,
      durationSeconds: recording.durationSeconds,
      transcriptionAvailable: willTranscribe,
    },
  });
}

/** Remove a gravação a pedido do usuário (spec §7.2: possibilidade de exclusão). */
export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId") ?? "";
  const questionId = url.searchParams.get("questionId") ?? "";

  const db = await getDb();
  const recording = await db.query.audioRecordings.findFirst({
    where: and(
      eq(audioRecordings.projectId, projectId),
      eq(audioRecordings.questionId, questionId),
    ),
  });
  if (!recording) return NextResponse.json({ ok: true });

  try {
    await requireWorkspace(recording.workspaceId);
  } catch {
    return NextResponse.json(
      { ok: false, message: "Sem permissão." },
      { status: 403 },
    );
  }

  await getStorageProvider().delete(recording.storageKey);
  await db.delete(audioRecordings).where(eq(audioRecordings.id, recording.id));
  return NextResponse.json({ ok: true });
}
