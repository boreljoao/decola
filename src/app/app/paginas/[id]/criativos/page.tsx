import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { Badge, Button, Card, EmptyState } from "@/components/ui";
import { env } from "@/config/env";
import { getWorkspacePlan } from "@/features/billing/entitlements";
import {
  creativeProposalsSchema,
  type CreativeProposals,
} from "@/features/creatives/generator";
import { RequestCreativesButton } from "@/features/creatives/request-button";
import { loadPageForProject, loadProject } from "@/features/projects/queries";
import { getDb } from "@/server/db";
import { creativeAssets, creativeSets } from "@/server/db/schema";

export const dynamic = "force-dynamic";

export default async function CriativosPage(
  props: PageProps<"/app/paginas/[id]/criativos">,
) {
  const { id } = await props.params;
  const data = await loadProject(id);
  if (!data) notFound();

  const page = await loadPageForProject(id);
  if (!page?.currentVersionId) {
    return (
      <EmptyState
        title="Criativos nascem da sua página"
        description="Conclua o briefing e a geração — os anúncios são compostos a partir da página, para campanha e destino contarem a mesma história."
        action={
          <Link href={`/app/paginas/${id}/briefing`}>
            <Button>Ir para o briefing</Button>
          </Link>
        }
      />
    );
  }

  const plan = await getWorkspacePlan(page.workspaceId);
  const devMode = env().mode !== "production";
  const franchise = plan.entitlements.creativesPerMonth;

  const db = await getDb();
  const sets = await db.query.creativeSets.findMany({
    where: eq(creativeSets.pageId, page.id),
    orderBy: [desc(creativeSets.createdAt)],
    limit: 10,
  });
  const assetsBySet = new Map<
    string,
    Array<typeof creativeAssets.$inferSelect>
  >();
  for (const s of sets) {
    assetsBySet.set(
      s.id,
      await db.query.creativeAssets.findMany({
        where: eq(creativeAssets.setId, s.id),
      }),
    );
  }

  const hasActiveSet = sets.some(
    (s) => s.status === "queued" || s.status === "running",
  );

  return (
    <div className="grid gap-6">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 style={{ fontFamily: "var(--font-sora)" }} className="text-xl font-bold">
              Criativos de anúncio
            </h2>
            <p className="mt-1 max-w-xl text-sm text-ink-600">
              Propostas de copy e imagem compostas a partir da página — Meta com
              imagem quadrada e vertical (composição tipográfica), Google como
              anúncio de texto validado e TikTok como roteiro para gravação.
            </p>
            {devMode && franchise.value <= 0 && (
              <p className="mt-2 text-xs font-medium text-warning-600">
                Modo de desenvolvimento: geração liberada como franquia de teste.
                Em produção, o plano {plan.name} não inclui criativos (Start
                inclui 2/mês).
              </p>
            )}
          </div>
          <RequestCreativesButton pageId={page.id} hasActiveSet={hasActiveSet} />
        </div>
      </Card>

      {sets.length === 0 && (
        <EmptyState
          title="Nenhuma proposta ainda"
          description="Gere o primeiro conjunto — cada proposta traz conceito, copy dentro dos limites e arquivos prontos para baixar."
        />
      )}

      {sets.map((set) => {
        const parsed = set.payload
          ? creativeProposalsSchema.safeParse(set.payload)
          : null;
        const proposals: CreativeProposals | null = parsed?.success
          ? parsed.data
          : null;
        const outdated = set.pageVersionId !== page.currentVersionId;
        const setAssets = assetsBySet.get(set.id) ?? [];
        return (
          <Card key={set.id} className="grid gap-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-ink-600">
                Conjunto de{" "}
                {set.createdAt.toLocaleString("pt-BR", {
                  timeZone: "America/Sao_Paulo",
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              <div className="flex items-center gap-2">
                {outdated && set.status === "completed" && (
                  <Badge tone="warning">
                    página mudou desde a geração — revise antes de usar
                  </Badge>
                )}
                <Badge
                  tone={
                    set.status === "completed"
                      ? "success"
                      : set.status === "failed"
                        ? "danger"
                        : "warning"
                  }
                >
                  {set.status === "completed"
                    ? "pronto"
                    : set.status === "failed"
                      ? "falhou"
                      : "gerando…"}
                </Badge>
              </div>
            </div>

            {set.status === "failed" && set.error && (
              <p role="alert" className="text-sm font-medium text-danger-600">
                {set.error}
              </p>
            )}

            {proposals?.meta && (
              <section className="grid gap-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-600">
                  Meta (Instagram/Facebook)
                </h3>
                <div className="grid gap-4 lg:grid-cols-2">
                  {proposals.meta.proposals.map((p, i) => (
                    <div
                      key={i}
                      className="grid gap-2 rounded-xl border border-ink-900/10 bg-paper p-4"
                    >
                      <p className="text-xs font-medium text-ink-600">
                        Proposta {i + 1} · {p.concept}
                      </p>
                      <p className="font-semibold">{p.headline}</p>
                      <p className="text-sm text-ink-600">{p.primaryText}</p>
                      {p.description && (
                        <p className="text-xs text-ink-600">↳ {p.description}</p>
                      )}
                      <p className="text-xs font-semibold text-electric-600">
                        Botão: {p.ctaLabel}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {setAssets
                          .filter((a) => a.kind.endsWith(`p${i + 1}`))
                          .map((a) => (
                            <a
                              key={a.id}
                              href={`/api/creatives/${a.id}`}
                              className="rounded-lg border border-ink-900/15 px-3 py-1.5 text-xs font-semibold hover:bg-ink-900/5"
                            >
                              ⬇ {a.kind.startsWith("meta_square") ? "Quadrado 1080×1080" : "Vertical 1080×1920"}
                            </a>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-ink-600">{proposals.meta.note}</p>
              </section>
            )}

            {proposals?.google && (
              <section className="grid gap-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-600">
                  Google (anúncio de texto)
                </h3>
                <div className="rounded-xl border border-ink-900/10 bg-paper p-4 text-sm">
                  <p className="font-medium text-electric-700">
                    {proposals.google.headlines.join(" | ")}
                  </p>
                  {proposals.google.descriptions.map((d, i) => (
                    <p key={i} className="mt-1 text-ink-600">
                      {d}
                    </p>
                  ))}
                  <p className="mt-2 text-xs text-ink-600">
                    URL final:{" "}
                    {proposals.google.finalUrl ?? proposals.google.finalUrlNote}
                  </p>
                </div>
                <p className="text-xs text-ink-600">{proposals.google.note}</p>
              </section>
            )}

            {proposals?.tiktok && (
              <section className="grid gap-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-600">
                  TikTok (roteiro para você gravar)
                </h3>
                <div className="rounded-xl border border-ink-900/10 bg-paper p-4 text-sm">
                  <p>
                    <strong>Gancho:</strong> {proposals.tiktok.roteiro.gancho}
                  </p>
                  <ol className="mt-2 grid list-decimal gap-1 pl-5 text-ink-600">
                    {proposals.tiktok.roteiro.cenas.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ol>
                  <p className="mt-2">
                    <strong>Fechamento:</strong> {proposals.tiktok.roteiro.cta}
                  </p>
                </div>
                <p className="text-xs font-medium text-warning-600">
                  {proposals.tiktok.note}
                </p>
              </section>
            )}
          </Card>
        );
      })}

      <p className="text-xs text-ink-600">
        A Decola não publica em contas de anúncios nem gasta orçamento — “pronto
        para baixar” e “campanha publicada” são estados diferentes.
      </p>
    </div>
  );
}
