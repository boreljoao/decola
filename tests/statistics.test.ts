import { describe, expect, it } from "vitest";
import {
  evaluateExperiment,
  normalCdf,
  shouldStopForRegression,
  twoSidedPValue,
} from "@/features/experiments/statistics";

/**
 * Invariante da spec §19.1 item 9: experimento sem amostra NUNCA declara
 * vencedor. E §13.2: sem significância, resultado é inconclusivo.
 */

describe("funções estatísticas", () => {
  it("normalCdf bate com valores conhecidos da normal padrão", () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 4);
    expect(normalCdf(1.96)).toBeCloseTo(0.975, 3);
    expect(normalCdf(-1.96)).toBeCloseTo(0.025, 3);
    expect(normalCdf(2.576)).toBeCloseTo(0.995, 3);
  });

  it("p-valor bicaudal em z=1.96 fica em torno de 0,05", () => {
    expect(twoSidedPValue(1.96)).toBeCloseTo(0.05, 2);
    expect(twoSidedPValue(0)).toBeCloseTo(1, 3);
  });
});

describe("veredito do experimento", () => {
  it("NUNCA declara vencedor sem a amostra mínima", () => {
    // Diferença enorme, mas amostra insuficiente: não há vencedor.
    const verdict = evaluateExperiment({
      control: { exposures: 10, conversions: 0 },
      variant: { exposures: 10, conversions: 9 },
      minSamplesPerVariant: 100,
    });
    expect(verdict.kind).toBe("awaiting_data");
    if (verdict.kind === "awaiting_data") {
      expect(verdict.missingSamples).toBe(90);
      expect(verdict.reason).toContain("visitas suficientes");
    }
  });

  it("amostra suficiente com diferença pequena é inconclusiva", () => {
    const verdict = evaluateExperiment({
      control: { exposures: 1000, conversions: 100 },
      variant: { exposures: 1000, conversions: 105 },
      minSamplesPerVariant: 500,
    });
    expect(verdict.kind).toBe("inconclusive");
    if (verdict.kind === "inconclusive") {
      expect(verdict.pValue).toBeGreaterThan(0.05);
      expect(verdict.reason).toContain("acaso");
    }
  });

  it("diferença grande e amostra robusta declara vencedor", () => {
    const verdict = evaluateExperiment({
      control: { exposures: 1000, conversions: 100 }, // 10%
      variant: { exposures: 1000, conversions: 160 }, // 16%
      minSamplesPerVariant: 500,
    });
    expect(verdict.kind).toBe("winner");
    if (verdict.kind === "winner") {
      expect(verdict.winner).toBe("variant");
      expect(verdict.pValue).toBeLessThan(0.05);
      // 6 pontos percentuais de diferença absoluta...
      expect(verdict.absoluteDiffPp).toBeCloseTo(6, 1);
      // ...que é 60% de variação relativa. São métricas distintas.
      expect(verdict.relativeChangePct).toBeCloseTo(60, 0);
    }
  });

  it("reconhece o controle como vencedor quando a variante piora", () => {
    const verdict = evaluateExperiment({
      control: { exposures: 2000, conversions: 300 },
      variant: { exposures: 2000, conversions: 180 },
      minSamplesPerVariant: 500,
    });
    expect(verdict.kind).toBe("winner");
    if (verdict.kind === "winner") {
      expect(verdict.winner).toBe("control");
      expect(verdict.absoluteDiffPp).toBeLessThan(0);
    }
  });

  it("comportamento idêntico não vira vitória", () => {
    const verdict = evaluateExperiment({
      control: { exposures: 500, conversions: 50 },
      variant: { exposures: 500, conversions: 50 },
      minSamplesPerVariant: 100,
    });
    expect(verdict.kind).toBe("inconclusive");
  });

  it("zero conversões dos dois lados não declara vencedor", () => {
    const verdict = evaluateExperiment({
      control: { exposures: 800, conversions: 0 },
      variant: { exposures: 800, conversions: 0 },
      minSamplesPerVariant: 200,
    });
    expect(verdict.kind).toBe("inconclusive");
  });
});

describe("guardrail de regressão", () => {
  it("interrompe quando a variante está muito pior", () => {
    expect(
      shouldStopForRegression({
        control: { exposures: 500, conversions: 100 }, // 20%
        variant: { exposures: 500, conversions: 40 }, // 8% → queda de 60%
        maxRelativeDrop: 0.5,
        minSamplesToJudge: 200,
      }),
    ).toBe(true);
  });

  it("não interrompe cedo demais, com pouca amostra", () => {
    expect(
      shouldStopForRegression({
        control: { exposures: 50, conversions: 10 },
        variant: { exposures: 50, conversions: 0 },
        maxRelativeDrop: 0.5,
        minSamplesToJudge: 200,
      }),
    ).toBe(false);
  });
});
