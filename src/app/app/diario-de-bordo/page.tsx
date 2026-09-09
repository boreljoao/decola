import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { Badge, Button, Card, EmptyState } from "@/components/ui";
import {
  generateMonthlyReport,
  previousPeriod,
} from "@/features/reports/monthly";
import { requireWorkspace } from "@/server/auth";
import { getDb } from "@/server/db";
import { pages } from "@/server/db/schema";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Diário de Bordo" };

/** Período fechado mais recente (mês anterior) no fuso de São Paulo. */
function lastClosedPeriod(): string {
  const now = new Date();
  const sp = new Date(now.getTime() - 3 * 3600 * 1000);
  return previousPeriod(
    `${sp.getUTCFullYear()}-${String(sp.getUTCMonth() + 1).padStart(2, "0")}`,
  );
}

export default async function DiarioDeBordoPage() {
  const ctx = await requireWorkspace();
  const db = await getDb();

  const pageRows = await db.query.pages.findMany({
    where: eq(pages.workspaceId, ctx.workspaceId),
  });
  const livePages = pageRows.filter((p) => p.status === "live");

  if (livePages.length === 0) {
    return (
      <div className="grid gap-6">
        <Header />
        <EmptyState
          title="O Diário de Bordo começa depois da decolagem"
          description="Publique uma página para receber o resumo mensal do que aconteceu: visitas, contatos e o que testar em seguida."
          action={
            <Link href="/app">
              <Button>Ver minhas páginas</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const period = lastClosedPeriod();
  const reports = await Promise.all(
    livePages.map(async (page) => ({
      page,
      ...(await generateMonthlyReport({ pageId: page.id, period })),
    })),
  );

  return (
    <div className="grid gap-6">
      <Header />
      {reports.map(({ page, report }) => (
        <Card key={page.id} className="grid gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2
                style={{ fontFamily: "var(--font-sora)" }}
                className="text-xl font-bold"
              >
                {report.pageName}
              </h2>
              <p className="text-sm text-ink-600">Período: {report.period}</p>
            </div>
            {report.metrics.pageViews < 100 && (
              <Badge tone="warning">amostra pequena</Badge>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Visitas", value: report.metrics.pageViews },
              { label: "Cliques no CTA", value: report.metrics.ctaClicks },
              {
                label: "Cliques no WhatsApp",
                value: report.metrics.whatsappClicks,
              },
              { label: "Leads", value: report.metrics.leads },
            ].map((m) => (
              <div key={m.label} className="rounded-xl bg-paper p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-600">
                  {m.label}
                </p>
                <p className="tabular mt-1 text-3xl font-bold">
                  {m.value.toLocaleString("pt-BR")}
                </p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-ink-900/10 p-4">
            <p className="text-sm font-medium">
              Taxa de conversão:{" "}
              {report.metrics.conversionRatePct == null ? (
                <span className="text-ink-600">
                  sem visitas no período — não há taxa a calcular
                </span>
              ) : (
                <>
                  <strong>{report.metrics.conversionRatePct}%</strong>{" "}
                  <span className="text-ink-600">
                    (conversões primárias ÷ {report.metrics.conversionDenominator}{" "}
                    visitas)
                  </span>
                </>
              )}
            </p>

            {report.comparison ? (
              <p className="mt-2 text-sm text-ink-600">
                Mês anterior: {report.comparison.previousConversionRatePct ?? 0}%
                em {report.comparison.previousPageViews} visitas.{" "}
                {report.comparison.diffPp != null && (
                  <>
                    Diferença de{" "}
                    <strong>
                      {report.comparison.diffPp > 0 ? "+" : ""}
                      {report.comparison.diffPp} pontos percentuais
                    </strong>
                    {report.comparison.relativeChangePct != null && (
                      <> ({report.comparison.relativeChangePct}% relativos)</>
                    )}
                    .{" "}
                  </>
                )}
                {report.comparison.sustained
                  ? "Com visitas suficientes nos dois meses, a melhora se sustenta."
                  : "Ainda não dá para afirmar que a mudança se sustenta."}
              </p>
            ) : (
              <p className="mt-2 text-sm text-ink-600">
                Sem dados do mês anterior para comparar — nenhuma variação é
                declarada.
              </p>
            )}
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            {[
              { label: "Testes em andamento", value: report.experiments.running },
              { label: "Concluídos", value: report.experiments.completed },
              {
                label: "Inconclusivos",
                value: report.experiments.inconclusive,
              },
            ].map((e) => (
              <p key={e.label} className="text-sm text-ink-600">
                {e.label}: <strong className="tabular">{e.value}</strong>
              </p>
            ))}
          </div>

          <div className="rounded-xl bg-electric-600/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-electric-600">
              Próximo passo sugerido
            </p>
            <p className="mt-1 text-sm">{report.recommendation}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}

function Header() {
  return (
    <div>
      <h1 style={{ fontFamily: "var(--font-sora)" }} className="text-3xl font-bold">
        Diário de Bordo
      </h1>
      <p className="mt-1 text-sm text-ink-600">
        O resumo mensal do que realmente aconteceu nas suas páginas — com o
        denominador de cada taxa à vista e sem melhora inventada.
      </p>
    </div>
  );
}
