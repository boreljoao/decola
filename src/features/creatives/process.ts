import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { env } from "@/config/env";
import type { BriefingAnswers } from "@/features/briefing/questions";
import { validatePageDocument } from "@/features/generation/page-document";
import { getDb } from "@/server/db";
import {
  briefingRevisions,
  creativeAssets,
  creativeSets,
  pages,
  pageVersions,
} from "@/server/db/schema";
import { generateCreativeProposals } from "./generator";
import { renderMetaCreatives } from "./render-image";

/** Handler do job "generate_creatives" — idempotente por setId. */
export async function processCreativeSet(
  payload: Record<string, unknown>,
): Promise<void> {
  const setId = String(payload.setId ?? "");
  if (!setId) throw new Error("payload.setId ausente");

  const db = await getDb();
  const set = await db.query.creativeSets.findFirst({
    where: eq(creativeSets.id, setId),
  });
  if (!set) throw new Error(`creative_set ${setId} não existe`);
  if (set.status === "completed") return;

  await db
    .update(creativeSets)
    .set({ status: "running", error: null })
    .where(eq(creativeSets.id, setId));

  try {
    const version = await db.query.pageVersions.findFirst({
      where: eq(pageVersions.id, set.pageVersionId),
    });
    if (!version) throw new Error("Versão da página não encontrada.");
    const validation = validatePageDocument(version.document);
    if (!validation.ok) throw new Error("Documento da página inválido.");
    const doc = validation.document;

    const revision = await db.query.briefingRevisions.findFirst({
      where: eq(briefingRevisions.id, doc.provenance.briefingRevisionId),
    });
    const answers = (revision?.answers ?? {}) as BriefingAnswers;

    const page = await db.query.pages.findFirst({
      where: eq(pages.id, set.pageId),
    });
    const e = env();
    const publishedUrl =
      page?.status === "live" && page.slug
        ? `${e.APP_URL.startsWith("https") ? "https" : "http"}://${page.slug}.${e.PUBLISH_ROOT_DOMAIN}`
        : undefined;

    const proposals = generateCreativeProposals({
      document: doc,
      pageVersionId: set.pageVersionId,
      answers,
      publishedUrl,
    });

    // Assets Meta: composição tipográfica real (PNG).
    const rendered = await renderMetaCreatives(doc, proposals);
    const dir = path.join(process.cwd(), ".data", "storage", "creatives", setId);
    await mkdir(dir, { recursive: true });

    for (const asset of rendered) {
      const filename = `${asset.kind}-p${asset.proposalIndex + 1}.png`;
      const filePath = path.join(dir, filename);
      await writeFile(filePath, asset.png);
      await db
        .insert(creativeAssets)
        .values({
          setId,
          workspaceId: set.workspaceId,
          kind: `${asset.kind}-p${asset.proposalIndex + 1}`,
          format: "png",
          width: asset.width,
          height: asset.height,
          filePath,
          bytes: asset.png.byteLength,
        })
        .onConflictDoNothing();
    }

    await db
      .update(creativeSets)
      .set({
        status: "completed",
        payload: proposals as unknown as Record<string, unknown>,
        completedAt: new Date(),
      })
      .where(eq(creativeSets.id, setId));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db
      .update(creativeSets)
      .set({ status: "failed", error: message.slice(0, 1000) })
      .where(eq(creativeSets.id, setId));
    throw err;
  }
}
