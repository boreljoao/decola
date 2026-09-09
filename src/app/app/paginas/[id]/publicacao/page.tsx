import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { Badge, Button, Card, EmptyState } from "@/components/ui";
import { env } from "@/config/env";
import { getWorkspacePlan } from "@/features/billing/entitlements";
import {
  DomainManager,
  type DomainView,
} from "@/features/domains/domain-ui";
import { dnsInstructions } from "@/features/domains/service";
import { PublishForm } from "@/features/pages/publish-form";
import { loadPageForProject, loadProject } from "@/features/projects/queries";
import { getDb } from "@/server/db";
import { domains, publicationDeployments } from "@/server/db/schema";

export const dynamic = "force-dynamic";

const DEPLOY_LABEL: Record<string, string> = {
  queued: "Na fila",
  building: "Construindo",
  live: "No ar",
  failed: "Falhou",
  superseded: "Substituída",
  unpublished: "Despublicada",
};

export default async function PublicacaoPage(
  props: PageProps<"/app/paginas/[id]/publicacao">,
) {
  const { id } = await props.params;
  const data = await loadProject(id);
  if (!data) notFound();

  const page = await loadPageForProject(id);
  if (!page?.currentVersionId) {
    return (
      <EmptyState
        title="Gere a página antes de publicar"
        description="A publicação usa a versão gerada a partir do seu briefing."
        action={
          <Link href={`/app/paginas/${id}/briefing`}>
            <Button>Ir para o briefing</Button>
          </Link>
        }
      />
    );
  }

  const plan = await getWorkspacePlan(page.workspaceId);
  const db = await getDb();

  const domainRow = await db.query.domains.findFirst({
    where: eq(domains.pageId, page.id),
  });
  const domainView: DomainView | null = domainRow
    ? {
        id: domainRow.id,
        host: domainRow.host,
        status: domainRow.status,
        lastError: domainRow.lastError,
        lastCheckedAt:
          domainRow.lastCheckedAt?.toLocaleString("pt-BR", {
            timeZone: "America/Sao_Paulo",
          }) ?? null,
        instructions: dnsInstructions(
          domainRow.host,
          domainRow.verificationToken,
        ),
      }
    : null;
  const deployments = await db.query.publicationDeployments.findMany({
    where: eq(publicationDeployments.pageId, page.id),
    orderBy: [desc(publicationDeployments.createdAt)],
    limit: 8,
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
      <Card>
        <h2 style={{ fontFamily: "var(--font-sora)" }} className="text-xl font-bold">
          Decolar: colocar a página no ar
        </h2>
        <p className="mt-2 mb-6 text-sm text-ink-600">
          Plano {plan.name}: {plan.entitlements.maxPublishedPages === "unlimited_commercial" ? "páginas ilimitadas" : `${plan.entitlements.maxPublishedPages} página publicada`}
          {plan.entitlements.showDecolaBadge &&
            ", em subdomínio Decola com a marca Decola no rodapé"}
          . Domínio próprio disponível nos planos pagos.
        </p>
        <PublishForm
          pageId={page.id}
          currentSlug={page.slug}
          rootDomain={env().PUBLISH_ROOT_DOMAIN}
          isLive={page.status === "live"}
        />

        <div className="mt-8 border-t border-ink-900/10 pt-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-600">
            Domínio próprio
          </h3>
          <p className="mt-1 mb-4 text-xs text-ink-600">
            Use o endereço do seu negócio no lugar do subdomínio Decola.
          </p>
          <DomainManager
            pageId={page.id}
            domain={domainView}
            customDomainAllowed={plan.entitlements.customDomain}
            planName={plan.name}
          />
        </div>
      </Card>

      <Card>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-600">
          Histórico de publicações
        </h3>
        {deployments.length === 0 ? (
          <p className="mt-4 text-sm text-ink-600">
            Nenhuma publicação ainda. A primeira decolagem fica registrada aqui.
          </p>
        ) : (
          <ul className="mt-4 grid gap-3">
            {deployments.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-ink-900/10 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{d.host}</p>
                  <p className="text-xs text-ink-600">
                    {d.createdAt.toLocaleString("pt-BR", {
                      timeZone: "America/Sao_Paulo",
                    })}
                  </p>
                </div>
                <Badge
                  tone={
                    d.status === "live"
                      ? "success"
                      : d.status === "failed"
                        ? "danger"
                        : "neutral"
                  }
                >
                  {DEPLOY_LABEL[d.status] ?? d.status}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
