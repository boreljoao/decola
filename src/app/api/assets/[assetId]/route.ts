import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireWorkspace } from "@/server/auth";
import { getDb } from "@/server/db";
import { assets, pages, pageVersions } from "@/server/db/schema";
import { getStorageProvider } from "@/server/storage";

/**
 * Leitura de asset (spec §16: originais privados, cópias públicas apenas após
 * publicação). Um asset é servido publicamente somente quando aparece na
 * versão PUBLICADA de uma página no ar; caso contrário exige membro do
 * workspace. UUID sozinho nunca é autorização.
 */

export const dynamic = "force-dynamic";

async function isReferencedByLivePage(
  assetId: string,
  workspaceId: string,
): Promise<boolean> {
  const db = await getDb();
  const livePages = await db.query.pages.findMany({
    where: and(eq(pages.workspaceId, workspaceId), eq(pages.status, "live")),
    columns: { publishedVersionId: true },
  });
  for (const page of livePages) {
    if (!page.publishedVersionId) continue;
    const version = await db.query.pageVersions.findFirst({
      where: eq(pageVersions.id, page.publishedVersionId),
      columns: { document: true },
    });
    if (!version) continue;
    if (JSON.stringify(version.document).includes(assetId)) return true;
  }
  return false;
}

export async function GET(
  request: Request,
  context: RouteContext<"/api/assets/[assetId]">,
) {
  const { assetId } = await context.params;

  const db = await getDb();
  const asset = await db.query.assets.findFirst({
    where: eq(assets.id, assetId),
  });
  if (!asset) return new NextResponse("Não encontrado.", { status: 404 });

  const publiclyVisible = await isReferencedByLivePage(
    asset.id,
    asset.workspaceId,
  );

  if (!publiclyVisible) {
    try {
      await requireWorkspace(asset.workspaceId);
    } catch {
      return new NextResponse("Sem permissão.", { status: 403 });
    }
  }

  try {
    const body = await getStorageProvider().get(asset.storageKey);
    return new NextResponse(new Uint8Array(body), {
      headers: {
        "content-type": asset.mimeType,
        "content-length": String(body.byteLength),
        "cache-control": publiclyVisible
          ? "public, max-age=31536000, immutable"
          : "private, max-age=60",
      },
    });
  } catch {
    return new NextResponse("Arquivo indisponível.", { status: 410 });
  }
}
