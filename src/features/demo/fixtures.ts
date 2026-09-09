import type { BriefingAnswers } from "@/features/briefing/questions";

/**
 * Fixtures de demonstração (spec §20): briefings fictícios claramente
 * identificados, processados pelo MESMO motor determinístico do produto.
 * Nenhum depoimento/prova é usado — provas ausentes ⇒ seção omitida.
 */

export interface DemoFixture {
  slug: string;
  label: string;
  nicheLabel: string;
  revisionId: string; // uuid fixo apenas para provenance da demo
  answers: BriefingAnswers;
}

const u = (v: unknown): { value: unknown; origin: "user" } => ({
  value: v,
  origin: "user",
});

export const DEMO_FIXTURES: DemoFixture[] = [
  {
    slug: "estetica",
    label: "Studio de estética",
    nicheLabel: "Estética e beleza",
    revisionId: "00000000-0000-4000-8000-000000000001",
    answers: {
      "identidade.nome": u("Studio Clara Nunes"),
      "oferta.nicho": u("estetica_beleza"),
      "oferta.descricao": u(
        "Tratamentos faciais personalizados, limpeza de pele profunda e protocolos de skincare para o dia a dia.",
      ),
      "oferta.oferta_principal": u("Avaliação de pele com plano personalizado"),
      "publico.dor": u(
        "Pele oleosa e marcas de acne que abalam a autoconfiança. Já tentou produtos por conta própria e nada resolveu de verdade.",
      ),
      "oferta.diferencial": u(
        "Protocolo de avaliação próprio, com acompanhamento entre as sessões pelo WhatsApp",
      ),
      "conversao.objetivo": u("whatsapp"),
      "conversao.whatsapp": u("+5511999990001"),
      "emocao.emocoes": u(["acolhimento", "confianca"]),
      "visual.tema": u("claro"),
      "visual.tom_premium": u(70),
    },
  },
  {
    slug: "gastronomia",
    label: "Cozinha artesanal",
    nicheLabel: "Gastronomia",
    revisionId: "00000000-0000-4000-8000-000000000002",
    answers: {
      "identidade.nome": u("Forno da Vila"),
      "oferta.nicho": u("gastronomia"),
      "oferta.descricao": u(
        "Pães de fermentação natural e encomendas para cafés e eventos, assados diariamente em forno a lenha.",
      ),
      "oferta.oferta_principal": u("Encomendas de fermentação natural para a semana"),
      "publico.dor": u(
        "Cansado de pão industrializado sem sabor; quer qualidade de padaria artesanal sem atravessar a cidade.",
      ),
      "oferta.diferencial": u(
        "Fermentação longa de 48 horas e fornadas limitadas por dia",
      ),
      "conversao.objetivo": u("whatsapp"),
      "conversao.whatsapp": u("+5511999990002"),
      "emocao.emocoes": u(["energia", "leveza"]),
      "visual.tema": u("escuro"),
      "visual.tom_premium": u(45),
    },
  },
  {
    slug: "infoproduto",
    label: "Curso online",
    nicheLabel: "Infoprodutos",
    revisionId: "00000000-0000-4000-8000-000000000003",
    answers: {
      "identidade.nome": u("Rota do Freela"),
      "oferta.nicho": u("infoprodutos"),
      "oferta.descricao": u(
        "Curso prático para quem quer começar a trabalhar como freelancer de design e conquistar os três primeiros clientes.",
      ),
      "oferta.oferta_principal": u("Turma de lançamento do curso Rota do Freela"),
      "publico.dor": u(
        "Quer viver de design, mas não sabe precificar, prospectar nem se apresentar. Trava na hora de cobrar.",
      ),
      "oferta.diferencial": u(
        "Método passo a passo com modelos prontos de proposta e precificação",
      ),
      "conversao.objetivo": u("lead_form"),
      "emocao.emocoes": u(["energia", "confianca", "urgencia"]),
      "visual.tema": u("escuro"),
      "visual.tom_premium": u(55),
    },
  },
];
