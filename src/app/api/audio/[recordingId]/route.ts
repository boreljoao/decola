import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireWorkspace } from "@/server/auth";
import { getDb } from "@/server/db";
import { audioRecordings } from "@/server/db/schema";
import { getStorageProvider } from "@/server/storage";

/**
 * Reprodução do áudio gravado. SEMPRE privado: áudio do briefing nunca é
 * público, nem depois de a página ser publicada (spec §7.2/§16).
 */

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: RouteContext<"/api/audio/[recordingId]">,
) {
  const { recordingId } = await context.params;

  const db = await getDb();
  const recording = await db.query.audioRecordings.findFirst({
    where: eq(audioRecordings.id, recordingId),
  });
  if (!recording) return new NextResponse("Não encontrado.", { status: 404 });

  try {
    await requireWorkspace(recording.workspaceId);
  } catch {
    return new NextResponse("Sem permissão.", { status: 403 });
  }

  if (recording.expiresAt <= new Date()) {
    return new NextResponse("Esta gravação expirou.", { status: 410 });
  }

  try {
    const body = await getStorageProvider().get(recording.storageKey);
    return new NextResponse(new Uint8Array(body), {
      headers: {
        "content-type": recording.mimeType,
        "content-length": String(body.byteLength),
        "cache-control": "private, no-store",
      },
    });
  } catch {
    return new NextResponse("Arquivo indisponível.", { status: 410 });
  }
}
