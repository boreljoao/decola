import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { Card, EmptyState } from "@/components/ui";
import { loadPageForProject, loadProject } from "@/features/projects/queries";
import { getDb } from "@/server/db";
import { analyticsEvents } from "@/server/db/schema";

export const dynamic = "force-dynamic";

/**
 * Métricas (spec §13.1): visitas, cliques e leads confirmados são métricas
 * distintas. Sem sessões mensuráveis (consentimento), a taxa de conversão por
 * sessão não é exibida — nada é inventado.
 */
export default async function MetricasPage(
  props: PageProps<"/app/paginas/[id]/metricas">,
) {
  const { id } = await props.params;
  const data = await loadProject(id);
  if (!data) notFound();

  const page = await loadPageForProject(id);
  if (!page || page.status !== "live") {
    return (
      <EmptyState
        title="Métricas chegam com a página no ar"
        description="Depois de decolar, cada visita e clique aparece aqui — em dados de verdade, nunca estimativas inventadas."
      />
    );
  }

  const db = await getDb();
  const events = await db.query.analyticsEvents.findMany({
    where: eq(analyticsEvents.pageId, page.id),
    columns: { type: true, day: true },
  });

  const count = (type: string) => events.filter((e) => e.type === type).length;
  const pageViews = count("page_view");
  const ctaClicks = count("cta_click");
  const whatsappClicks = count("whatsapp_click");
  const formSubmits = count("form_submit_success");

  const metrics = [
    { label: "Visitas (page views)", value: pageViews },
    { label: "Cliques no CTA", value: ctaClicks },
    { label: "Cliques no WhatsApp", value: whatsappClicks, note: "Clique no botão — não é conversa confirmada." },
    { label: "Leads confirmados", value: formSubmits },
  ];

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <Card key={m.label}>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-600">
              {m.label}
            </p>
            <p
              style={{ fontFamily: "var(--font-sora)" }}
              className="tabular mt-2 text-4xl font-bold"
            >
              {m.value.toLocaleString("pt-BR")}
            </p>
            {m.note && <p className="mt-2 text-xs text-ink-600">{m.note}</p>}
          </Card>
        ))}
      </div>
      {pageViews === 0 && (
        <p className="text-sm text-ink-600">
          Ainda não há visitas registradas. Compartilhe o endereço da sua página
          para começar a medir — os números aqui são sempre eventos reais.
        </p>
      )}
      <p className="text-xs text-ink-600">
        Medição first-party da Decola: sem cookies e sem identificadores
        persistentes por padrão. Eventos de preview e do painel não entram na
        conta.
      </p>
    </div>
  );
}
