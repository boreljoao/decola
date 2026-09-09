import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { getWorkspacePlan } from "@/features/billing/entitlements";
import { validatePageDocument } from "@/features/generation/page-document";
import { getDb } from "@/server/db";
import {
  analyticsEvents,
  experimentAssignments,
  experiments,
  experimentVariants,
  pages,
  pageVersions,
} from "@/server/db/schema";
import {
  evaluateExperiment,
  shouldStopForRegression,
  type ExperimentVerdict,
} from "./statistics";

/**
 * Voo Contínuo (spec §13.2):
 * página ativa e plano elegível → tráfego suficiente → hipótese → variante →
 * teste → avaliação → adotar/manter/reverter → relatar.
 *
 * Alterações automáticas ficam restritas a título, CTA e ordem de seções —
 * nunca a fatos comerciais (preço, provas, garantias, destino).
 */

/** Tráfego mínimo para sequer propor um teste. */
export const MIN_TRAFFIC_TO_PROPOSE = 100;
export const DEFAULT_MIN_SAMPLES = 200;
export const DEFAULT_MDE_PP = 3;

export type EligibilityResult =
  | { eligible: true; recentViews: number }
  | { eligible: false; reason: string; recentViews: number };

export async function checkEligibility(
  pageId: string,
): Promise<EligibilityResult> {
  const db = await getDb();
  const page = await db.query.pages.findFirst({ where: eq(pages.id, pageId) });
  if (!page) return { eligible: false, reason: "Página não encontrada.", recentViews: 0 };

  const views = await db.query.analyticsEvents.findMany({
    where: and(
      eq(analyticsEvents.pageId, pageId),
      eq(analyticsEvents.type, "page_view"),
    ),
    columns: { id: true },
  });
  const recentViews = views.length;

  if (page.status !== "live") {
    return {
      eligible: false,
      reason: "A página precisa estar no ar para receber testes.",
      recentViews,
    };
  }

  const plan = await getWorkspacePlan(page.workspaceId);
  if (!plan.entitlements.vooContinuo) {
    return {
      eligible: false,
      reason: `O Voo Contínuo faz parte dos planos pagos. Seu plano atual é ${plan.name}.`,
      recentViews,
    };
  }

  if (recentViews < MIN_TRAFFIC_TO_PROPOSE) {
    return {
      eligible: false,
      reason: `Ainda não há visitas suficientes para comparar versões (${recentViews} de ${MIN_TRAFFIC_TO_PROPOSE}).`,
      recentViews,
    };
  }

  const active = await db.query.experiments.findFirst({
    where: and(eq(experiments.pageId, pageId), eq(experiments.status, "running")),
  });
  if (active) {
    return {
      eligible: false,
      reason: "Já existe um teste em andamento nesta página.",
      recentViews,
    };
  }

  return { eligible: true, recentViews };
}

export interface HypothesisProposal {
  hypothesis: string;
  goalEvent: string;
  change: { kind: "headline" | "cta_label"; from: string; to: string };
}

/**
 * Propõe uma hipótese a partir do documento vigente. Alterações limitadas a
 * título e rótulo de CTA — nada que mude um fato comercial.
 */
export async function proposeHypothesis(
  pageId: string,
): Promise<HypothesisProposal | null> {
  const db = await getDb();
  const page = await db.query.pages.findFirst({ where: eq(pages.id, pageId) });
  if (!page?.publishedVersionId) return null;

  const version = await db.query.pageVersions.findFirst({
    where: eq(pageVersions.id, page.publishedVersionId),
  });
  if (!version) return null;

  const validation = validatePageDocument(version.document);
  if (!validation.ok) return null;
  const doc = validation.document;

  const hero = doc.sections.find((s) => s.type === "hero");
  if (hero?.type !== "hero") return null;

  const goalEvent =
    doc.primaryConversion.type === "whatsapp"
      ? "whatsapp_click"
      : doc.primaryConversion.type === "lead_form"
        ? "form_submit_success"
        : "cta_click";

  const currentHeadline = hero.props.headline;
  const shorter = currentHeadline.split(/[,.–—-]/)[0].trim();

  if (shorter.length >= 12 && shorter.length < currentHeadline.length) {
    return {
      hypothesis:
        "Um título mais curto e direto pode ser lido por mais visitantes antes da rolagem, aumentando os cliques no botão principal.",
      goalEvent,
      change: { kind: "headline", from: currentHeadline, to: shorter },
    };
  }

  const cta = doc.primaryConversion.label;
  const alternative =
    doc.primaryConversion.type === "whatsapp"
      ? "Falar agora no WhatsApp"
      : `${cta} sem compromisso`;

  return {
    hypothesis:
      "Um texto de botão mais explícito sobre o próximo passo pode reduzir a hesitação e aumentar os cliques.",
    goalEvent,
    change: { kind: "cta_label", from: cta, to: alternative.slice(0, 60) },
  };
}

/** Cria o experimento com controle e variante em versões imutáveis. */
export async function startExperiment(input: {
  pageId: string;
  workspaceId: string;
  profileId: string;
  proposal: HypothesisProposal;
}): Promise<{ ok: boolean; experimentId?: string; error?: string }> {
  const db = await getDb();
  const eligibility = await checkEligibility(input.pageId);
  if (!eligibility.eligible) {
    return { ok: false, error: eligibility.reason };
  }

  const page = await db.query.pages.findFirst({
    where: eq(pages.id, input.pageId),
  });
  if (!page?.publishedVersionId) {
    return { ok: false, error: "A página precisa ter uma versão publicada." };
  }

  const controlVersion = await db.query.pageVersions.findFirst({
    where: eq(pageVersions.id, page.publishedVersionId),
  });
  if (!controlVersion) return { ok: false, error: "Versão base ausente." };

  const validation = validatePageDocument(controlVersion.document);
  if (!validation.ok) return { ok: false, error: "Documento base inválido." };

  // Aplica a mudança proposta gerando a versão da variante.
  const variantDoc = structuredClone(validation.document);
  const hero = variantDoc.sections.find((s) => s.type === "hero");
  if (input.proposal.change.kind === "headline" && hero?.type === "hero") {
    hero.props.headline = input.proposal.change.to;
  } else if (input.proposal.change.kind === "cta_label") {
    variantDoc.primaryConversion.label = input.proposal.change.to;
    if (hero?.type === "hero") hero.props.ctaLabel = input.proposal.change.to;
  }

  const revalidated = validatePageDocument(variantDoc);
  if (!revalidated.ok) {
    return { ok: false, error: "A variante gerada não passou na validação." };
  }

  return await db.transaction(async (tx) => {
    const existing = await tx.query.pageVersions.findMany({
      where: eq(pageVersions.pageId, page.id),
      columns: { version: true },
    });
    const nextVersion =
      existing.reduce((m, v) => Math.max(m, v.version), 0) + 1;

    const [variantVersion] = await tx
      .insert(pageVersions)
      .values({
        pageId: page.id,
        workspaceId: input.workspaceId,
        version: nextVersion,
        document: revalidated.document as unknown as Record<string, unknown>,
        source: "ai_edit",
        createdBy: input.profileId,
      })
      .returning();

    const [experiment] = await tx
      .insert(experiments)
      .values({
        workspaceId: input.workspaceId,
        pageId: page.id,
        status: "running",
        hypothesis: input.proposal.hypothesis,
        goalEvent: input.proposal.goalEvent,
        minSamplesPerVariant: DEFAULT_MIN_SAMPLES,
        minDetectableEffectPp: DEFAULT_MDE_PP,
        startedAt: new Date(),
        createdBy: input.profileId,
      })
      .returning();

    await tx.insert(experimentVariants).values([
      {
        experimentId: experiment.id,
        workspaceId: input.workspaceId,
        role: "control",
        label: "Versão atual",
        pageVersionId: controlVersion.id,
      },
      {
        experimentId: experiment.id,
        workspaceId: input.workspaceId,
        role: "variant",
        label: "Versão de teste",
        pageVersionId: variantVersion.id,
      },
    ]);

    return { ok: true, experimentId: experiment.id };
  });
}

export interface ExperimentReport {
  verdict: ExperimentVerdict;
  control: { label: string; exposures: number; conversions: number; rate: number };
  variant: { label: string; exposures: number; conversions: number; rate: number };
  regressionDetected: boolean;
}

export async function evaluate(experimentId: string): Promise<ExperimentReport | null> {
  const db = await getDb();
  const experiment = await db.query.experiments.findFirst({
    where: eq(experiments.id, experimentId),
  });
  if (!experiment) return null;

  const variants = await db.query.experimentVariants.findMany({
    where: eq(experimentVariants.experimentId, experimentId),
  });
  const control = variants.find((v) => v.role === "control");
  const variant = variants.find((v) => v.role === "variant");
  if (!control || !variant) return null;

  const controlStats = {
    exposures: control.exposures,
    conversions: control.conversions,
  };
  const variantStats = {
    exposures: variant.exposures,
    conversions: variant.conversions,
  };

  const verdict = evaluateExperiment({
    control: controlStats,
    variant: variantStats,
    minSamplesPerVariant: experiment.minSamplesPerVariant,
  });

  const regressionDetected = shouldStopForRegression({
    control: controlStats,
    variant: variantStats,
    maxRelativeDrop: 0.5,
    minSamplesToJudge: Math.floor(experiment.minSamplesPerVariant / 2),
  });

  const rate = (s: { exposures: number; conversions: number }) =>
    s.exposures > 0 ? Number(((s.conversions / s.exposures) * 100).toFixed(1)) : 0;

  return {
    verdict,
    control: { label: control.label, ...controlStats, rate: rate(controlStats) },
    variant: { label: variant.label, ...variantStats, rate: rate(variantStats) },
    regressionDetected,
  };
}

/** Registra exposição e conversão de uma sessão atribuída (idempotente). */
export async function recordExposure(input: {
  experimentId: string;
  variantId: string;
  assignmentKey: string;
}): Promise<void> {
  const db = await getDb();
  const inserted = await db
    .insert(experimentAssignments)
    .values(input)
    .onConflictDoNothing({
      target: [
        experimentAssignments.experimentId,
        experimentAssignments.assignmentKey,
      ],
    })
    .returning({ id: experimentAssignments.id });

  if (inserted.length > 0) {
    await db
      .update(experimentVariants)
      .set({ exposures: sqlIncrement("exposures") })
      .where(eq(experimentVariants.id, input.variantId));
  }
}

export async function recordConversion(input: {
  experimentId: string;
  assignmentKey: string;
}): Promise<void> {
  const db = await getDb();
  const assignment = await db.query.experimentAssignments.findFirst({
    where: and(
      eq(experimentAssignments.experimentId, input.experimentId),
      eq(experimentAssignments.assignmentKey, input.assignmentKey),
    ),
  });
  // Sem exposição registrada não há conversão; e a mesma sessão conta uma vez.
  if (!assignment || assignment.converted) return;

  await db
    .update(experimentAssignments)
    .set({ converted: true })
    .where(eq(experimentAssignments.id, assignment.id));
  await db
    .update(experimentVariants)
    .set({ conversions: sqlIncrement("conversions") })
    .where(eq(experimentVariants.id, assignment.variantId));
}

/** Incremento atômico no banco — evita perder contagem sob concorrência. */
function sqlIncrement(column: "exposures" | "conversions") {
  return sql`${sql.identifier(column)} + 1`;
}
