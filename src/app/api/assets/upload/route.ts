import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  FAILURE_MESSAGES,
  MAX_IMAGE_BYTES,
  validateImage,
} from "@/features/assets/validate-image";
import { assertRole, requireWorkspace } from "@/server/auth";
import { getDb } from "@/server/db";
import { assets, projects } from "@/server/db/schema";
import { rateLimit } from "@/server/security/rate-limit";
import { StorageError, getStorageProvider } from "@/server/storage";

/**
 * Upload de imagem do usuário (spec §16): valida MIME real, tamanho e
 * dimensões; recusa SVG; remove EXIF de JPEG; grava no StorageProvider e
 * registra o asset com fronteira de workspace.
 */

export const dynamic = "force-dynamic";

const metaSchema = z.object({
  projectId: z.string().uuid(),
  kind: z.enum(["logo", "image"]).default("image"),
  alt: z.string().trim().max(200).optional(),
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
    kind: form.get("kind") ?? "image",
    alt: form.get("alt") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Dados do upload inválidos." },
      { status: 400 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { ok: false, message: "Selecione um arquivo de imagem." },
      { status: 400 },
    );
  }
  // Corta cedo pelo tamanho declarado antes de materializar o buffer.
  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { ok: false, message: FAILURE_MESSAGES.too_large },
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

  const limit = rateLimit(`upload:${ctx.workspaceId}`, 30, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, message: "Muitos envios seguidos. Aguarde um instante." },
      { status: 429 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const validation = validateImage(buffer);
  if (!validation.ok) {
    return NextResponse.json(
      { ok: false, message: FAILURE_MESSAGES[validation.reason] },
      { status: 415 },
    );
  }

  const id = crypto.randomUUID();
  const storageKey = `workspaces/${ctx.workspaceId}/${id}.${validation.info.extension}`;

  try {
    await getStorageProvider().put({
      key: storageKey,
      body: validation.sanitized,
      contentType: validation.info.mime,
    });
  } catch (err) {
    const message =
      err instanceof StorageError && err.code === "not_configured"
        ? "Armazenamento de imagens não configurado neste ambiente."
        : "Falha ao gravar a imagem. Tente novamente.";
    return NextResponse.json({ ok: false, message }, { status: 503 });
  }

  const [asset] = await db
    .insert(assets)
    .values({
      id,
      workspaceId: ctx.workspaceId,
      projectId: project.id,
      kind: parsed.data.kind,
      storageKey,
      mimeType: validation.info.mime,
      bytes: validation.sanitized.byteLength,
      width: validation.info.width,
      height: validation.info.height,
      originalName: file.name.slice(0, 200),
      alt: parsed.data.alt,
      uploadedBy: ctx.user.profileId,
    })
    .returning();

  return NextResponse.json({
    ok: true,
    asset: {
      id: asset.id,
      url: `/api/assets/${asset.id}`,
      width: asset.width,
      height: asset.height,
      alt: asset.alt ?? "",
    },
  });
}
