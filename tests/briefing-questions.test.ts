import { describe, expect, it } from "vitest";
import {
  validateForCompletion,
  visibleQuestions,
  type BriefingAnswers,
} from "@/features/briefing/questions";

const u = (v: unknown) => ({ value: v, origin: "user" as const });

describe("contrato de perguntas", () => {
  it("pergunta de WhatsApp só aparece quando o objetivo é whatsapp", () => {
    const semObjetivo: BriefingAnswers = {};
    expect(
      visibleQuestions("rapido", semObjetivo).some(
        (q) => q.id === "conversao.whatsapp",
      ),
    ).toBe(false);

    const comObjetivo: BriefingAnswers = {
      "conversao.objetivo": u("whatsapp"),
    };
    expect(
      visibleQuestions("rapido", comObjetivo).some(
        (q) => q.id === "conversao.whatsapp",
      ),
    ).toBe(true);
  });

  it("conclusão exige respostas obrigatórias e reporta as faltantes", () => {
    const result = validateForCompletion("rapido", {
      "identidade.nome": u("Studio Teste"),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.missing).toContain("oferta.descricao");
      expect(result.missing).toContain("publico.dor");
    }
  });

  it("resposta de pergunta oculta não contamina o briefing final", () => {
    // objetivo mudou de whatsapp para compra: o telefone respondido antes
    // não pode entrar no resultado final.
    const answers: BriefingAnswers = {
      "identidade.nome": u("Studio Teste"),
      "oferta.nicho": u("estetica_beleza"),
      "oferta.descricao": u("Tratamentos faciais personalizados."),
      "oferta.oferta_principal": u("Avaliação de pele"),
      "publico.dor": u("Pele oleosa que abala a autoconfiança."),
      "oferta.diferencial": u("Protocolo próprio"),
      "conversao.objetivo": u("compra"),
      "conversao.whatsapp": u("+5511912345678"),
      "conversao.link_destino": u("https://loja.exemplo.com.br/checkout"),
      "emocao.emocoes": u(["confianca"]),
      "visual.tema": u("claro"),
    };
    const result = validateForCompletion("rapido", answers);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.cleaned["conversao.whatsapp"]).toBeUndefined();
      expect(result.cleaned["conversao.link_destino"]).toBeDefined();
    }
  });

  it("telefone inválido é reportado com mensagem", () => {
    const answers: BriefingAnswers = {
      "identidade.nome": u("Studio Teste"),
      "oferta.nicho": u("estetica_beleza"),
      "oferta.descricao": u("Tratamentos faciais personalizados."),
      "oferta.oferta_principal": u("Avaliação de pele"),
      "publico.dor": u("Pele oleosa que abala a autoconfiança."),
      "oferta.diferencial": u("Protocolo próprio"),
      "conversao.objetivo": u("whatsapp"),
      "conversao.whatsapp": u("123"),
      "emocao.emocoes": u(["confianca"]),
      "visual.tema": u("claro"),
    };
    const result = validateForCompletion("rapido", answers);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.invalid.some((i) => i.id === "conversao.whatsapp")).toBe(true);
    }
  });
});
