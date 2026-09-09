import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireWorkspace } from "@/server/auth";
import { getDb } from "@/server/db";
import { audioRecordings } from "@/server/db/schema";

/** Estado da transcrição assíncrona de uma gravação (spec §7.2). */

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: RouteContext<"/api/audio/status/[recordingId]">,
) {
  const { recordingId } = await context.params;

  const db = await getDb();
  const recording = await db.query.audioRecordings.findFirst({
    where: eq(audioRecordings.id, recordingId),
  });
  if (!recording) {
    return NextResponse.json({ status: "not_found" }, { status: 404 });
  }

  try {
    await requireWorkspace(recording.workspaceId);
  } catch {
    return NextResponse.json({ status: "forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    status: recording.status,
    transcript: recording.transcript,
    error: recording.error,
  });
}
