"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { canPublishPage } from "@/features/billing/entitlements";
import { validatePageDocument } from "@/features/generation/page-document";
import { requireWorkspace, assertRole } from "@/server/auth";
import { getDb } from "@/server/db";
import {
  auditLog,
  pages,
  pageVersions,
  publicationDeployments,
} from "@/server/db/schema";

import { publicPageAddress, publicPageUrl } from "@/features/pages/public-url";
/**
 * Publicação (spec §11.1): deployment de versão imutável, verificação de
 * entitlement, reserva de slug e troca atômica somente após sucesso.
 * Falha preserva a publicação anterior.
 */

export interface PublishState {
  ok?: boolean;
  error?: string;
  url?: string;
}

const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/, {
    message:
      "Use de 3 a 40 caracteres: letras minúsculas, números e hífens (sem começar/terminar com hífen).",
  });

const RESERVED_SLUGS = new Set([
  "www",
  "app",
  "api",
  "admin",
  "decola",
  "mail",
  "blog",
  "status",
]);

export async function publishPageAction(
  _prev: PublishState,
  formData: FormData,
): Promise<PublishState> {
  const pageId = String(formData.get("pageId") ?? "");
  const slugRaw = formData.get("slug");

  const db = await getDb();
  const page = await db.query.pages.findFirst({ where: eq(pages.id, pageId) });
  if (!page) return { error: "Página não encontrada." };

  const ctx = await requireWorkspace(page.workspaceId);
  assertRole(ctx, "editor");

  if (!page.currentVersionId) {
    return { error: "Gere a página antes de publicar." };
  }

  // slug: usa o existente ou o enviado
  let slug = page.slug;
  if (slugRaw != null && String(slugRaw).length > 0) {
    const parsed = slugSchema.safeParse(slugRaw);
    if (!parsed.success) return { error: parsed.error.issues[0].message };
    slug = parsed.data;
  }
  if (!slug) return { error: "Escolha um endereço (slug) para a página." };
  if (RESERVED_SLUGS.has(slug)) {
    return { error: "Esse endereço é reservado. Escolha outro." };
  }

  // entitlement (Free: 1 página publicada, com marca)
  const eligibility = await canPublishPage(page.workspaceId, page.id);
  if (!eligibility.ok) return { error: eligibility.reason };

  const version = await db.query.pageVersions.findFirst({
    where: eq(pageVersions.id, page.currentVersionId),
  });
  if (!version) return { error: "Versão atual não encontrada." };

  // "build": valida o documento persistido contra o schema do renderer
  const validation = validatePageDocument(version.document);
  if (!validation.ok) {
    return {
      error:
        "A versão atual está inválida e não pode ser publicada: " +
        validation.issues.slice(0, 3).join("; "),
    };
  }

  const host = publicPageAddress(slug);

  try {
    await db.transaction(async (tx) => {
      // reserva de slug: unicidade garantida pelo índice; conflito → erro claro
      const clash = await tx.query.pages.findFirst({
        where: eq(pages.slug, slug),
      });
      if (clash && clash.id !== page.id) {
        throw new Error("Esse endereço já está em uso. Escolha outro.");
      }

      const [deployment] = await tx
        .insert(publicationDeployments)
        .values({
          pageId: page.id,
          pageVersionId: version.id,
          workspaceId: page.workspaceId,
          status: "building",
          host,
          showBadge: eligibility.showBadge,
          createdBy: ctx.user.profileId,
        })
        .returning();

      // swap atômico: só aqui a versão vira a publicada
      await tx
        .update(publicationDeployments)
        .set({ status: "live", completedAt: new Date() })
        .where(eq(publicationDeployments.id, deployment.id));

      const previous = await tx.query.publicationDeployments.findMany({
        where: eq(publicationDeployments.pageId, page.id),
      });
      for (const d of previous) {
        if (d.id !== deployment.id && d.status === "live") {
          await tx
            .update(publicationDeployments)
            .set({ status: "superseded" })
            .where(eq(publicationDeployments.id, d.id));
        }
      }

      await tx
        .update(pages)
        .set({
          slug,
          status: "live",
          publishedVersionId: version.id,
          updatedAt: new Date(),
        })
        .where(eq(pages.id, page.id));

      await tx.insert(auditLog).values({
        workspaceId: page.workspaceId,
        actorProfileId: ctx.user.profileId,
        action: "page.publish",
        target: page.id,
        meta: { slug, versionId: version.id, deploymentId: deployment.id },
      });
    });

    revalidatePath(`/app/paginas/${page.projectId}/publicacao`);
    return { ok: true, url: publicPageUrl(slug) };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha na publicação.";
    await db
      .update(pages)
      .set({ status: page.status === "live" ? "live" : "publish_failed" })
      .where(eq(pages.id, page.id));
    return { error: message };
  }
}

export async function unpublishPageAction(
  _prev: PublishState,
  formData: FormData,
): Promise<PublishState> {
  const pageId = String(formData.get("pageId") ?? "");
  const db = await getDb();
  const page = await db.query.pages.findFirst({ where: eq(pages.id, pageId) });
  if (!page) return { error: "Página não encontrada." };
  const ctx = await requireWorkspace(page.workspaceId);
  assertRole(ctx, "editor");

  await db.transaction(async (tx) => {
    const live = await tx.query.publicationDeployments.findMany({
      where: eq(publicationDeployments.pageId, page.id),
    });
    for (const d of live) {
      if (d.status === "live") {
        await tx
          .update(publicationDeployments)
          .set({ status: "unpublished", completedAt: new Date() })
          .where(eq(publicationDeployments.id, d.id));
      }
    }
    await tx
      .update(pages)
      .set({ status: "paused", publishedVersionId: null, updatedAt: new Date() })
      .where(eq(pages.id, page.id));
    await tx.insert(auditLog).values({
      workspaceId: page.workspaceId,
      actorProfileId: ctx.user.profileId,
      action: "page.unpublish",
      target: page.id,
    });
  });

  revalidatePath(`/app/paginas/${page.projectId}/publicacao`);
  return { ok: true };
}
