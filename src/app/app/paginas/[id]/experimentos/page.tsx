import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { Badge, Card, EmptyState } from "@/components/ui";
import { ExperimentActions } from "@/features/experiments/experiment-actions";
import {
  checkEligibility,
  evaluate,
  proposeHypothesis,
} from "@/features/experiments/service";
import { loadPageForProject, loadProject } from "@/features/projects/queries";
import { getDb } from "@/server/db";
import { experiments } from "@/server/db/schema";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<
  string,
  { label: string; tone: "neutral" | "success" | "warning" | "danger" | "info" }
> = {
  draft: { label: "Rascunho", tone: "neutral" },
  awaiting_data: { label: "Aguardando dados", tone: "warning" },
  ready: { label: "Pronto", tone: "info" },
  running: { label: "Em teste", tone: "info" },
  paused: { label: "Pausado", tone: "warning" },
  inconclusive: { label: "Inconclusivo", tone: "neutral" },
  completed: { label: "Concluído", tone: "success" },
  rolled_back: { label: "Revertido", tone: "neutral" },
};

export default async function ExperimentosPage(
  props: PageProps<"/app/paginas/[id]/experimentos">,
) {
  const { id } = await props.params;
  const data = await loadProject(id);
  if (!data) notFound();

  const page = await loadPageForProject(id);
  if (!page) {
    return (
      <EmptyState
        title="O Voo Contínuo começa com a página no ar"
        description="Publique sua página para que a Decola possa observar o comportamento real dos visitantes."
      />
    );
  }

  const eligibility = await checkEligibility(page.id);
  const proposal = eligibility.eligible ? await proposeHypothesis(page.id) : null;

  const db = await getDb();
  const rows = await db.query.experiments.findMany({
    where: eq(experiments.pageId, page.id),
    orderBy: [desc(experiments.createdAt)],
    limit: 10,
  });

  const reports = await Promise.all(
    rows.map(async (e) => ({ experiment: e, report: await evaluate(e.id) })),
  );

  return (
    <div className="grid gap-6">
      <Card>
        <h2 style={{ fontFamily: "var(--font-sora)" }} className="text-xl font-bold">
          Voo Contínuo
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-ink-600">
          Observar → formular uma hipótese → testar → manter ou reverter. A
          Decola só declara um vencedor quando os dados sustentam a conclusão;
          sem amostra suficiente, o teste fica “aguardando dados”.
        </p>

        {!eligibility.eligible ? (
          <div className="mt-5 rounded-xl border border-warning-600/30 bg-warning-600/5 p-4">
            <p className="text-sm font-medium text-warning-600">
              {eligibility.reason}
            </p>
            <p className="mt-1 text-xs text-ink-600">
              Visitas registradas até agora: {eligibility.recentViews}.
            </p>
          </div>
        ) : proposal ? (
          <div className="mt-5 grid gap-3 rounded-xl border border-electric-600/30 bg-electric-600/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-electric-600">
              Hipótese sugerida
            </p>
            <p className="text-sm">{proposal.hypothesis}</p>
            <div className="grid gap-1 text-xs text-ink-600">
              <p>
                <strong>O que muda:</strong>{" "}
                {proposal.change.kind === "headline"
                  ? "título do topo"
                  : "texto do botão"}
              </p>
              <p className="truncate">Atual: “{proposal.change.from}”</p>
              <p className="truncate">Teste: “{proposal.change.to}”</p>
              <p>
                <strong>Meta:</strong> {proposal.goalEvent}
              </p>
            </div>
            <p className="text-xs text-ink-600">
              Preços, provas e o destino do botão não são alterados por testes
              automáticos.
            </p>
            <ExperimentActions pageId={page.id} mode="start" />
          </div>
        ) : (
          <p className="mt-5 text-sm text-ink-600">
            Nenhuma hipótese disponível para esta página no momento.
          </p>
        )}
      </Card>

      {reports.length === 0 ? (
        <EmptyState
          title="Nenhum teste ainda"
          description="Quando houver visitas suficientes, a Decola propõe a primeira hipótese e você decide se quer testá-la."
        />
      ) : (
        reports.map(({ experiment, report }) => {
          const status = STATUS_LABEL[experiment.status] ?? STATUS_LABEL.draft;
          return (
            <Card key={experiment.id} className="grid gap-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="max-w-xl text-sm font-medium">
                  {experiment.hypothesis}
                </p>
                <Badge tone={status.tone}>{status.label}</Badge>
              </div>

              {report && (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[report.control, report.variant].map((v) => (
                      <div
                        key={v.label}
                        className="rounded-xl border border-ink-900/10 bg-paper p-4"
                      >
                        <p className="text-xs font-semibold uppercase tracking-wide text-ink-600">
                          {v.label}
                        </p>
                        <p className="tabular mt-1 text-2xl font-bold">
                          {v.rate}%
                        </p>
                        <p className="text-xs text-ink-600">
                          {v.conversions} conversões em {v.exposures} visitas
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-xl bg-ink-900/5 p-4 text-sm">
                    {report.verdict.kind === "awaiting_data" && (
                      <p>
                        {report.verdict.reason} Faltam{" "}
                        <strong>{report.verdict.missingSamples}</strong> visitas
                        na menor variante.
                      </p>
                    )}
                    {report.verdict.kind === "inconclusive" && (
                      <p>
                        {report.verdict.reason} (p ={" "}
                        {report.verdict.pValue.toFixed(3)})
                      </p>
                    )}
                    {report.verdict.kind === "winner" && (
                      <p>
                        Vencedor:{" "}
                        <strong>
                          {report.verdict.winner === "variant"
                            ? "versão de teste"
                            : "versão original"}
                        </strong>{" "}
                        — diferença de{" "}
                        <strong>{report.verdict.absoluteDiffPp} pontos percentuais</strong>{" "}
                        ({report.verdict.relativeChangePct}% relativos), p ={" "}
                        {report.verdict.pValue.toFixed(3)}.
                      </p>
                    )}
                    {report.regressionDetected && (
                      <p className="mt-2 font-medium text-danger-600">
                        A versão de teste está claramente pior — considere
                        reverter agora.
                      </p>
                    )}
                  </div>
                </>
              )}

              {experiment.conclusion && (
                <p className="text-sm text-ink-600">{experiment.conclusion}</p>
              )}

              {experiment.status === "running" && (
                <ExperimentActions
                  pageId={page.id}
                  experimentId={experiment.id}
                  mode="manage"
                />
              )}
            </Card>
          );
        })
      )}
    </div>
  );
}
