import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { env } from "@/config/env";
import {
  validatePageDocument,
} from "@/features/generation/page-document";
import { PageRenderer } from "@/features/pages/renderer";
import { getDb } from "@/server/db";
import { pages, pageVersions, publicationDeployments } from "@/server/db/schema";

/**
 * Site publicado (spec §11.1): serve exclusivamente a versão publicada.
 * Nenhum estado privado do app é acessível a partir daqui.
 */

export const dynamic = "force-dynamic";

async function loadPublished(slug: string) {
  const db = await getDb();
  const page = await db.query.pages.findFirst({ where: eq(pages.slug, slug) });
  if (!page || page.status !== "live" || !page.publishedVersionId) return null;

  const version = await db.query.pageVersions.findFirst({
    where: eq(pageVersions.id, page.publishedVersionId),
  });
  if (!version) return null;

  const validation = validatePageDocument(version.document);
  if (!validation.ok) return null;

  const deployments = await db.query.publicationDeployments.findMany({
    where: eq(publicationDeployments.pageId, page.id),
    orderBy: [desc(publicationDeployments.createdAt)],
    limit: 1,
  });

  return {
    page,
    version,
    document: validation.document,
    showBadge: deployments[0]?.showBadge ?? true,
  };
}

export async function generateMetadata(
  props: PageProps<"/sites/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const data = await loadPublished(slug);
  if (!data) return { title: "Página não encontrada" };
  const proto = env().APP_URL.startsWith("https") ? "https" : "http";
  return {
    title: data.document.seo.title,
    description: data.document.seo.description,
    robots: data.document.seo.noindex ? { index: false } : undefined,
    alternates: {
      canonical: `${proto}://${slug}.${env().PUBLISH_ROOT_DOMAIN}`,
    },
    openGraph: {
      title: data.document.seo.title,
      description: data.document.seo.description,
      locale: "pt_BR",
      type: "website",
    },
  };
}

export default async function PublishedSitePage(
  props: PageProps<"/sites/[slug]">,
) {
  const { slug } = await props.params;
  const data = await loadPublished(slug);
  if (!data) notFound();

  return (
    <PageRenderer
      doc={data.document}
      pageId={data.page.id}
      pageVersionId={data.version.id}
      preview={false}
      showBadge={data.showBadge}
      appUrl={env().APP_URL}
    />
  );
}
