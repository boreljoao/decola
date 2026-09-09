import { describe, expect, it } from "vitest";
import type { BriefingAnswers } from "@/features/briefing/questions";
import { validatePageDocument } from "@/features/generation/page-document";
import { generatePageDocument } from "@/features/generation/rules-engine";

const u = (v: unknown) => ({ value: v, origin: "user" as const });

function baseAnswers(overrides: Partial<Record<string, unknown>> = {}): BriefingAnswers {
  const base: Record<string, unknown> = {
    "identidade.nome": "Studio Teste",
    "oferta.nicho": "estetica_beleza",
    "oferta.descricao":
      "Tratamentos faciais personalizados e limpeza de pele profunda.",
    "oferta.oferta_principal": "Avaliação de pele personalizada",
    "publico.dor": "Pele oleosa que abala a autoconfiança.",
    "oferta.diferencial": "Protocolo próprio de avaliação",
    "conversao.objetivo": "whatsapp",
    "conversao.whatsapp": "+5511912345678",
    "emocao.emocoes": ["confianca"],
    "visual.tema": "claro",
    ...overrides,
  };
  return Object.fromEntries(
    Object.entries(base).map(([k, v]) => [k, u(v)]),
  ) as BriefingAnswers;
}

const input = (answers: BriefingAnswers, hash = "hash-a") => ({
  briefingRevisionId: "00000000-0000-4000-8000-00000000aaaa",
  answersHash: hash,
  answers,
});

describe("motor determinístico", () => {
  it("produz documento válido pelo schema do renderer", () => {
    const doc = generatePageDocument(input(baseAnswers()));
    const result = validatePageDocument(doc);
    expect(result.ok).toBe(true);
  });

  it("é determinístico: mesmo briefing ⇒ mesmo documento (exceto timestamp)", () => {
    const a = generatePageDocument(input(baseAnswers()));
    const b = generatePageDocument(input(baseAnswers()));
    expect({ ...a, provenance: null }).toEqual({ ...b, provenance: null });
  });

  it("briefings diferentes produzem composições diferentes", () => {
    const a = generatePageDocument(input(baseAnswers(), "hash-a"));
    const b = generatePageDocument(
      input(
        baseAnswers({
          "identidade.nome": "Forno da Vila",
          "oferta.nicho": "gastronomia",
          "oferta.descricao": "Pães de fermentação natural assados diariamente.",
          "oferta.oferta_principal": "Encomendas para a semana",
          "publico.dor": "Cansado de pão industrializado sem sabor.",
          "visual.tema": "escuro",
        }),
        "hash-b",
      ),
    );
    expect(a.designTokens.palette.bg).not.toEqual(b.designTokens.palette.bg);
    const heroA = a.sections.find((s) => s.type === "hero");
    const heroB = b.sections.find((s) => s.type === "hero");
    expect(heroA?.props).not.toEqual(heroB?.props);
  });

  it("NUNCA inventa prova: sem provas no briefing, seção proof é omitida", () => {
    const doc = generatePageDocument(input(baseAnswers()));
    expect(doc.sections.some((s) => s.type === "proof")).toBe(false);
  });

  it("provas informadas geram seção proof com o texto do usuário", () => {
    const doc = generatePageDocument(
      input(
        baseAnswers({
          "conteudo.provas":
            "“Melhor atendimento da região” — Juliana P., cliente desde 2023",
        }),
      ),
    );
    const proof = doc.sections.find((s) => s.type === "proof");
    expect(proof).toBeDefined();
    if (proof?.type === "proof") {
      expect(proof.props.items[0].text).toContain("Melhor atendimento");
      expect(proof.props.items[0].source).toContain("Juliana");
    }
  });

  it("objetivo lead_form inclui a seção de formulário e destino #form", () => {
    const doc = generatePageDocument(
      input(
        baseAnswers({
          "conversao.objetivo": "lead_form",
          "conversao.whatsapp": undefined,
        }),
      ),
    );
    expect(doc.sections.some((s) => s.type === "lead_form")).toBe(true);
    expect(doc.primaryConversion.destination).toBe("#form");
    expect(validatePageDocument(doc).ok).toBe(true);
  });

  it("registra campos inferidos em provenance (CTA sem texto do usuário)", () => {
    const doc = generatePageDocument(input(baseAnswers()));
    expect(doc.provenance.inferredFields).toContain("conversao.cta_texto");
  });
});

describe("validação do PageDocument", () => {
  it("rejeita destino não-https para compra", () => {
    const doc = generatePageDocument(input(baseAnswers()));
    const tampered = {
      ...doc,
      primaryConversion: {
        type: "compra" as const,
        label: "Comprar",
        destination: "javascript:alert(1)",
      },
    };
    const result = validatePageDocument(tampered);
    expect(result.ok).toBe(false);
  });

  it("rejeita objetivo lead_form sem seção de formulário", () => {
    const doc = generatePageDocument(input(baseAnswers()));
    const tampered = {
      ...doc,
      primaryConversion: {
        type: "lead_form" as const,
        label: "Enviar",
        destination: "#form",
      },
    };
    const result = validatePageDocument(tampered);
    expect(result.ok).toBe(false);
  });

  it("rejeita seções com ids duplicados", () => {
    const doc = generatePageDocument(input(baseAnswers()));
    const tampered = { ...doc, sections: [doc.sections[0], doc.sections[0]] };
    const result = validatePageDocument(tampered);
    expect(result.ok).toBe(false);
  });
});
