/**
 * Avaliação estatística de experimentos (spec §13.2).
 *
 * Método: teste z de duas proporções, bicaudal, com correção de continuidade.
 * Escolhido por ser adequado a conversão binária (converteu/não converteu),
 * documentado e verificável — a spec proíbe inventar significância.
 *
 * Regras honestas embutidas:
 * - Sem amostra mínima, o resultado é "aguardando dados". Nunca vencedor.
 * - Sem significância ao fim da janela, o resultado é "inconclusivo" e o
 *   original é mantido.
 * - Diferença é reportada em PONTOS PERCENTUAIS (absoluta) e, separadamente,
 *   em variação relativa — a spec exige distinguir as duas.
 *
 * Módulo puro, sem I/O.
 */

export interface VariantStats {
  exposures: number;
  conversions: number;
}

export type ExperimentVerdict =
  | { kind: "awaiting_data"; reason: string; missingSamples: number }
  | { kind: "inconclusive"; reason: string; pValue: number }
  | {
      kind: "winner";
      winner: "control" | "variant";
      pValue: number;
      absoluteDiffPp: number;
      relativeChangePct: number;
    };

export interface EvaluationInput {
  control: VariantStats;
  variant: VariantStats;
  minSamplesPerVariant: number;
  /** Nível de significância; 0.05 é o default desta versão. */
  alpha?: number;
}

export function conversionRate(stats: VariantStats): number {
  if (stats.exposures <= 0) return 0;
  return stats.conversions / stats.exposures;
}

/**
 * Função de distribuição acumulada da normal padrão.
 * Aproximação de Abramowitz & Stegun 26.2.17 (erro < 7.5e-8) — suficiente
 * para decisão em alpha = 0.05 e verificável contra tabelas conhecidas.
 */
export function normalCdf(z: number): number {
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) *
      t +
      0.254829592) *
      t *
      Math.exp(-x * x);
  return 0.5 * (1 + sign * y);
}

export function twoSidedPValue(z: number): number {
  return 2 * (1 - normalCdf(Math.abs(z)));
}

export function evaluateExperiment(input: EvaluationInput): ExperimentVerdict {
  const { control, variant, minSamplesPerVariant } = input;
  const alpha = input.alpha ?? 0.05;

  // 1. Amostra mínima definida ANTES do início. Sem ela, não há veredito.
  const missing = Math.max(
    0,
    minSamplesPerVariant - Math.min(control.exposures, variant.exposures),
  );
  if (missing > 0) {
    return {
      kind: "awaiting_data",
      reason:
        "Ainda não há visitas suficientes para comparar as versões com confiança.",
      missingSamples: missing,
    };
  }

  const p1 = conversionRate(control);
  const p2 = conversionRate(variant);
  const n1 = control.exposures;
  const n2 = variant.exposures;

  // Proporção combinada sob a hipótese nula.
  const pooled = (control.conversions + variant.conversions) / (n1 + n2);
  const standardError = Math.sqrt(pooled * (1 - pooled) * (1 / n1 + 1 / n2));

  if (standardError === 0) {
    return {
      kind: "inconclusive",
      reason:
        "As duas versões tiveram exatamente o mesmo comportamento — não há diferença a declarar.",
      pValue: 1,
    };
  }

  // Correção de continuidade: evita superestimar a diferença em amostras pequenas.
  const continuity = 0.5 * (1 / n1 + 1 / n2);
  const rawDiff = Math.abs(p2 - p1);
  const corrected = Math.max(0, rawDiff - continuity);
  const z = corrected / standardError;
  const pValue = twoSidedPValue(z);

  if (pValue > alpha) {
    return {
      kind: "inconclusive",
      reason:
        "A diferença observada ainda pode ser acaso. Mantemos a versão original.",
      pValue,
    };
  }

  return {
    kind: "winner",
    winner: p2 > p1 ? "variant" : "control",
    pValue,
    // Pontos percentuais (absoluto) e variação relativa são coisas distintas.
    absoluteDiffPp: Number(((p2 - p1) * 100).toFixed(2)),
    relativeChangePct:
      p1 > 0 ? Number((((p2 - p1) / p1) * 100).toFixed(1)) : 0,
  };
}

/**
 * Guardrail (spec §13.2): interrompe o teste se a variante estiver claramente
 * pior, para não sacrificar conversão durante o experimento.
 */
export function shouldStopForRegression(input: {
  control: VariantStats;
  variant: VariantStats;
  /** Queda relativa tolerada antes de abortar (ex.: 0.5 = 50% pior). */
  maxRelativeDrop: number;
  minSamplesToJudge: number;
}): boolean {
  const { control, variant, maxRelativeDrop, minSamplesToJudge } = input;
  if (
    control.exposures < minSamplesToJudge ||
    variant.exposures < minSamplesToJudge
  ) {
    return false;
  }
  const p1 = conversionRate(control);
  const p2 = conversionRate(variant);
  if (p1 <= 0) return false;
  return (p1 - p2) / p1 >= maxRelativeDrop;
}
