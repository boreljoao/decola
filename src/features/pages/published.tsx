import "server-only";
import type { Metadata } from "next";
import { and, desc, eq } from "drizzle-orm";
import { env } from "@/config/env";
import { validatePageDocument } from "@/features/generation/page-document";
import {
  INTEGRATIONS,
  type IntegrationKind,
} from "@/features/integrations/definitions";
import { getDb } from "@/server/db";
import {
  domains,
  integrationConnections,
  pages,
  pageVersions,
  publicationDeployments,
} from "@/server/db/schema";
import { PageRenderer } from "./renderer";

/**
 * Carregamento e render da página publicada (spec §11.1). Compartilhado entre
 * o acesso por subdomínio Decola e por domínio próprio verificado — as duas
 * portas servem exatamente a mesma versão publicada, sem estado privado.
 */

type PageRow = typeof pages.$inferSelect;

async function buildPublished(page: PageRow | undefined) {
  if (!page || page.status !== "live" || !page.publishedVersionId) return null;

  const db = await getDb();
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

  // Integrações do dono da página; os scripts só carregam com consentimento.
  const connections = await db.query.integrationConnections.findMany({
    where: and(
      eq(integrationConnections.workspaceId, page.workspaceId),
      eq(integrationConnections.status, "connected"),
    ),
  });
  const integrations = connections
    .map((c) => {
      const definition = INTEGRATIONS[c.kind as IntegrationKind];
      const id = (c.config as { id?: string })?.id;
      if (!definition?.available || !id) return null;
      return { kind: definition.kind, id, category: definition.consentCategory };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  return {
    page,
    version,
    document: validation.document,
    showBadge: deployments[0]?.showBadge ?? true,
    integrations,
  };
}

export async function loadPublishedBySlug(slug: string) {
  const db = await getDb();
  const page = await db.query.pages.findFirst({ where: eq(pages.slug, slug) });
  return buildPublished(page);
}

/** Resolve por domínio próprio: só hosts verificados e ativos servem página. */
export async function loadPublishedByDomain(host: string) {
  const db = await getDb();
  const domain = await db.query.domains.findFirst({
    where: eq(domains.host, host.toLowerCase()),
  });
  if (!domain) return null;
  if (domain.status !== "active" && domain.status !== "ssl_pending") return null;

  const page = await db.query.pages.findFirst({
    where: eq(pages.id, domain.pageId),
  });
  return buildPublished(page);
}

type PublishedData = NonNullable<Awaited<ReturnType<typeof buildPublished>>>;

export function publishedMetadata(
  data: PublishedData | null,
  canonicalHost: string,
): Metadata {
  if (!data) return { title: "Página não encontrada" };
  const proto = env().APP_URL.startsWith("https") ? "https" : "http";
  return {
    title: data.document.seo.title,
    description: data.document.seo.description,
    robots: data.document.seo.noindex ? { index: false } : undefined,
    alternates: { canonical: `${proto}://${canonicalHost}` },
    openGraph: {
      title: data.document.seo.title,
      description: data.document.seo.description,
      locale: "pt_BR",
      type: "website",
    },
  };
}

export function PublishedPage({
  data,
  thirdPartyScripts = true,
}: {
  data: PublishedData;
  /**
   * `false` quando a página divide origem com o painel (endereço por caminho):
   * pixel e analytics de terceiros não carregam nem com consentimento.
   */
  thirdPartyScripts?: boolean;
}) {
  return (
    <PageRenderer
      doc={data.document}
      pageId={data.page.id}
      pageVersionId={data.version.id}
      preview={false}
      showBadge={data.showBadge}
      appUrl={env().APP_URL}
      integrations={thirdPartyScripts ? data.integrations : []}
    />
  );
}
