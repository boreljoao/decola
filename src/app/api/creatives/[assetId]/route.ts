import { readFile } from "node:fs/promises";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireWorkspace } from "@/server/auth";
import { getDb } from "@/server/db";
import { creativeAssets } from "@/server/db/schema";

/**
 * Download autorizado de asset de criativo (spec §10: exportar arquivos reais).
 * A fronteira de workspace é validada no servidor — UUID não é autorização.
 */
export async function GET(
  request: Request,
  context: RouteContext<"/api/creatives/[assetId]">,
) {
  const { assetId } = await context.params;

  const db = await getDb();
  const asset = await db.query.creativeAssets.findFirst({
    where: eq(creativeAssets.id, assetId),
  });
  if (!asset) return new NextResponse("Não encontrado.", { status: 404 });

  try {
    await requireWorkspace(asset.workspaceId);
  } catch {
    return new NextResponse("Sem permissão.", { status: 403 });
  }

  try {
    const file = await readFile(asset.filePath);
    return new NextResponse(new Uint8Array(file), {
      headers: {
        "content-type": "image/png",
        "content-length": String(asset.bytes),
        "content-disposition": `attachment; filename="decola-${asset.kind}.png"`,
        "cache-control": "private, max-age=300",
      },
    });
  } catch {
    return new NextResponse("Arquivo indisponível.", { status: 410 });
  }
}
