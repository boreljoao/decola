import "server-only";
import { and, eq, gte, lt } from "drizzle-orm";
import { z } from "zod";
import { getBalance } from "@/features/billing/credits";
import { getDb } from "@/server/db";
import {
  analyticsEvents,
  experiments,
  leads,
  monthlyReports,
  pages,
} from "@/server/db/schema";

/**
 * Diário de Bordo (spec §13.3): job idempotente por workspace/página/mês.
 *
 * Honestidade obrigatória:
 * - conversão sempre com denominador explícito;
 * - "melhora" só aparece quando sustentada por comparação real com o mês
 *   anterior, e separando pontos percentuais de variação relativa;
 * - com pouco tráfego, o relatório orienta aquisição em vez de inventar avanço.
 */

export const monthlyReportSchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/),
  pageName: z.string(),
  metrics: z.object({
    pageViews: z.number().int().nonnegative(),
    ctaClicks: z.number().int().nonnegative(),
    whatsappClicks: z.number().int().nonnegative(),
    leads: z.number().int().nonnegative(),
    /** Conversões primárias / visitas, com o denominador explícito. */
    conversionRatePct: z.number().nullable(),
    conversionDenominator: z.number().int().nonnegative(),
  }),
  comparison: z
    .object({
      previousPageViews: z.number().int().nonnegative(),
      previousConversionRatePct: z.number().nullable(),
      /** Diferença em PONTOS percentuais (não confundir com variação relativa). */
      diffPp: z.number().nullable(),
      relativeChangePct: z.number().nullable(),
      sustained: z.boolean(),
    })
    .nullable(),
  experiments: z.object({
    running: z.number().int().nonnegative(),
    completed: z.number().int().nonnegative(),
    inconclusive: z.number().int().nonnegative(),
  }),
  creditsAvailable: z.number().int().nonnegative(),
  recommendation: z.string(),
});

export type MonthlyReport = z.infer<typeof monthlyReportSchema>;

/** Limites do mês no fuso de São Paulo (UTC-3, sem horário de verão). */
function monthBounds(period: string): { start: Date; end: Date } {
  const [year, month] = period.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1, 3, 0, 0));
  const end = new Date(Date.UTC(year, month, 1, 3, 0, 0));
  return { start, end };
}

export function previousPeriod(period: string): string {
  const [year, month] = period.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 2, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

async function collectMetrics(pageId: string, period: string) {
  const db = await getDb();
  const { start, end } = monthBounds(period);

  const events = await db.query.analyticsEvents.findMany({
    where: and(
      eq(analyticsEvents.pageId, pageId),
      gte(analyticsEvents.createdAt, start),
      lt(analyticsEvents.createdAt, end),
    ),
    columns: { type: true },
  });

  const leadRows = await db.query.leads.findMany({
    where: and(
      eq(leads.pageId, pageId),
      gte(leads.createdAt, start),
      lt(leads.createdAt, end),
    ),
    columns: { id: true },
  });

  const count = (type: string) => events.filter((e) => e.type === type).length;
  const pageViews = count("page_view");
  const whatsappClicks = count("whatsapp_click");
  const formSubmits = count("form_submit_success");
  const ctaClicks = count("cta_click");

  // Conversão primária: cliques de WhatsApp + envios de formulário.
  const primaryConversions = whatsappClicks + formSubmits;
  const conversionRatePct =
    pageViews > 0
      ? Number(((primaryConversions / pageViews) * 100).toFixed(1))
      : null;

  return {
    pageViews,
    ctaClicks,
    whatsappClicks,
    leads: leadRows.length,
    conversionRatePct,
    conversionDenominator: pageViews,
  };
}

/**
 * Gera (ou devolve) o relatório do período. Idempotente: o índice único
 * (page_id, period) garante um relatório por mês, mesmo com o job reexecutado.
 */
export async function generateMonthlyReport(input: {
  pageId: string;
  period: string;
}): Promise<{ report: MonthlyReport; created: boolean }> {
  const db = await getDb();

  const existing = await db.query.monthlyReports.findFirst({
    where: and(
      eq(monthlyReports.pageId, input.pageId),
      eq(monthlyReports.period, input.period),
    ),
  });
  if (existing) {
    return {
      report: monthlyReportSchema.parse(existing.data),
      created: false,
    };
  }

  const page = await db.query.pages.findFirst({
    where: eq(pages.id, input.pageId),
  });
  if (!page) throw new Error("Página não encontrada.");

  const current = await collectMetrics(input.pageId, input.period);
  const previousKey = previousPeriod(input.period);
  const previous = await collectMetrics(input.pageId, previousKey);

  let comparison: MonthlyReport["comparison"] = null;
  if (previous.pageViews > 0 && current.pageViews > 0) {
    const diffPp =
      current.conversionRatePct != null && previous.conversionRatePct != null
        ? Number(
            (current.conversionRatePct - previous.conversionRatePct).toFixed(1),
          )
        : null;
    const relativeChangePct =
      previous.conversionRatePct && previous.conversionRatePct > 0 && diffPp != null
        ? Number(((diffPp / previous.conversionRatePct) * 100).toFixed(0))
        : null;
    comparison = {
      previousPageViews: previous.pageViews,
      previousConversionRatePct: previous.conversionRatePct,
      diffPp,
      relativeChangePct,
      // "Melhora sustentada" exige amostra dos dois meses e ganho relevante.
      sustained:
        diffPp != null &&
        diffPp > 0 &&
        previous.pageViews >= 100 &&
        current.pageViews >= 100,
    };
  }

  const experimentRows = await db.query.experiments.findMany({
    where: eq(experiments.pageId, input.pageId),
    columns: { status: true },
  });

  const balance = await getBalance(page.workspaceId);

  const recommendation = buildRecommendation(current, comparison);

  const report: MonthlyReport = {
    period: input.period,
    pageName: page.name,
    metrics: current,
    comparison,
    experiments: {
      running: experimentRows.filter((e) => e.status === "running").length,
      completed: experimentRows.filter((e) => e.status === "completed").length,
      inconclusive: experimentRows.filter((e) => e.status === "inconclusive")
        .length,
    },
    creditsAvailable: balance.available,
    recommendation,
  };

  const validated = monthlyReportSchema.parse(report);

  const inserted = await db
    .insert(monthlyReports)
    .values({
      workspaceId: page.workspaceId,
      pageId: page.id,
      period: input.period,
      data: validated as unknown as Record<string, unknown>,
    })
    .onConflictDoNothing({
      target: [monthlyReports.pageId, monthlyReports.period],
    })
    .returning({ id: monthlyReports.id });

  return { report: validated, created: inserted.length > 0 };
}

function buildRecommendation(
  metrics: Awaited<ReturnType<typeof collectMetrics>>,
  comparison: MonthlyReport["comparison"],
): string {
  if (metrics.pageViews === 0) {
    return "Sua página não recebeu visitas neste período. O próximo passo é divulgação: compartilhe o endereço nas suas redes e no seu perfil, ou use os criativos para anunciar.";
  }
  if (metrics.pageViews < 100) {
    return `Com ${metrics.pageViews} visita(s), ainda não dá para tirar conclusões sobre o que funciona. Foque em trazer mais visitantes antes de mudar a página.`;
  }
  if (metrics.conversionRatePct != null && metrics.conversionRatePct < 1) {
    return "Há tráfego, mas poucos contatos. Vale testar um título mais direto ou deixar o botão principal mais visível — o Voo Contínuo pode conduzir esse teste.";
  }
  if (comparison?.sustained) {
    return "A conversão subiu em relação ao mês anterior, com visitas suficientes nos dois meses para a comparação fazer sentido. Mantenha o que está funcionando.";
  }
  return "Os números estão estáveis. Um teste de título ou de texto do botão é o próximo passo para descobrir o que melhora a conversão.";
}
