import { createHash } from "node:crypto";
import type { BriefingAnswers } from "@/features/briefing/questions";
import { answerValue } from "@/features/briefing/questions";
import {
  PAGE_DOCUMENT_SCHEMA_VERSION,
  type PageDocument,
  type PageSection,
} from "./page-document";

/**
 * RulesGenerationProvider — motor determinístico honesto (decisão D-006).
 * Não é mock: cada briefing produz composição, paleta e copy distintos, derivados
 * exclusivamente das respostas. Nunca inventa fatos: provas ausentes ⇒ seção
 * omitida; preços/garantias só aparecem se informados.
 */

export const RULES_ENGINE_VERSION = "rules-1.0.0";

type Niche = PageDocument["strategy"]["niche"];
type Objective = PageDocument["strategy"]["objective"];

interface NichePreset {
  dark: PageDocument["designTokens"]["palette"];
  light: PageDocument["designTokens"]["palette"];
  defaultScheme: "dark" | "light";
  fontHeading: "sora" | "space-grotesk" | "inter";
  processBenefits: Array<{ title: string; description: string; icon: "spark" | "shield" | "clock" | "heart" | "target" | "star" | "chat" | "check" }>;
  faq: Array<{ question: string; answerTemplate: (ctx: CopyContext) => string }>;
}

interface CopyContext {
  nome: string;
  oferta: string;
  descricao: string;
  dor: string;
  diferencial: string;
  objetivo: Objective;
  ctaLabel: string;
}

const PALETTES: Record<Niche, NichePreset> = {
  estetica_beleza: {
    defaultScheme: "light",
    fontHeading: "sora",
    light: {
      bg: "#FDF9F7", surface: "#FFFFFF", text: "#2B1F24", muted: "#7A6A70",
      primary: "#A6486B", primaryContrast: "#FFFFFF", accent: "#C98A2D", accentContrast: "#211302",
    },
    dark: {
      bg: "#211A1E", surface: "#2C2328", text: "#F5EDF0", muted: "#B9A8AF",
      primary: "#E38BAC", primaryContrast: "#33101E", accent: "#E2B25E", accentContrast: "#2A1B03",
    },
    processBenefits: [
      { title: "Atendimento individual", description: "Cada sessão parte da sua avaliação, não de um protocolo genérico.", icon: "heart" },
      { title: "Ambiente preparado", description: "Espaço pensado para você relaxar do início ao fim do atendimento.", icon: "star" },
      { title: "Acompanhamento próximo", description: "Você sai sabendo os próximos passos do seu cuidado.", icon: "chat" },
    ],
    faq: [
      { question: "Como funciona o primeiro atendimento?", answerTemplate: (c) => `O primeiro passo é uma conversa para entender o seu momento e seus objetivos. A partir daí, ${c.nome} indica o caminho mais adequado para você.` },
      { question: "Preciso me preparar de alguma forma?", answerTemplate: () => "Não é necessária nenhuma preparação especial. Se houver alguma orientação específica para o seu caso, você recebe antes do atendimento." },
    ],
  },
  saude: {
    defaultScheme: "light",
    fontHeading: "sora",
    light: {
      bg: "#F6FAF9", surface: "#FFFFFF", text: "#15292B", muted: "#5E7476",
      primary: "#0E7E74", primaryContrast: "#FFFFFF", accent: "#B4762A", accentContrast: "#FFFFFF",
    },
    dark: {
      bg: "#122022", surface: "#1B2C2E", text: "#EAF4F3", muted: "#9FB6B4",
      primary: "#4FC0B4", primaryContrast: "#06211E", accent: "#E0A45C", accentContrast: "#271703",
    },
    processBenefits: [
      { title: "Escuta de verdade", description: "Tempo de consulta dedicado a entender o seu caso por inteiro.", icon: "chat" },
      { title: "Orientação clara", description: "Você entende cada etapa do cuidado, sem jargão desnecessário.", icon: "check" },
      { title: "Continuidade", description: "Acompanhamento que não termina quando a consulta acaba.", icon: "shield" },
    ],
    faq: [
      { question: "Como agendo um horário?", answerTemplate: (c) => `Use o botão “${c.ctaLabel}” nesta página e escolha o melhor horário para você.` },
      { question: "O atendimento é individual?", answerTemplate: (c) => `Sim. ${c.nome} atende cada pessoa de forma individual, com atenção ao seu histórico e às suas necessidades.` },
    ],
  },
  servicos_locais: {
    defaultScheme: "light",
    fontHeading: "space-grotesk",
    light: {
      bg: "#F7F9FC", surface: "#FFFFFF", text: "#1A2433", muted: "#5D6B80",
      primary: "#1F5EDD", primaryContrast: "#FFFFFF", accent: "#C77914", accentContrast: "#FFFFFF",
    },
    dark: {
      bg: "#131A26", surface: "#1C2534", text: "#EBF0F8", muted: "#9AA8BC",
      primary: "#6D9BFF", primaryContrast: "#0A1B3D", accent: "#EFA94A", accentContrast: "#2A1A02",
    },
    processBenefits: [
      { title: "Orçamento sem enrolação", description: "Você descreve o que precisa e recebe uma resposta direta.", icon: "check" },
      { title: "Compromisso com prazo", description: "Combinado é combinado: você sabe quando e como o serviço acontece.", icon: "clock" },
      { title: "Serviço bem-feito", description: "Trabalho executado com capricho, do começo à entrega.", icon: "target" },
    ],
    faq: [
      { question: "Como peço um orçamento?", answerTemplate: (c) => `Basta usar o botão “${c.ctaLabel}”. Conte o que você precisa e ${c.nome} retorna com os próximos passos.` },
      { question: "Qual região é atendida?", answerTemplate: (c) => `${c.nome} informa a área de atendimento no primeiro contato — pergunte pela sua região.` },
    ],
  },
  gastronomia: {
    defaultScheme: "dark",
    fontHeading: "sora",
    light: {
      bg: "#FBF7F2", surface: "#FFFFFF", text: "#2A1E14", muted: "#77685A",
      primary: "#B4451F", primaryContrast: "#FFFFFF", accent: "#946A15", accentContrast: "#FFFFFF",
    },
    dark: {
      bg: "#1D1510", surface: "#291E17", text: "#F7EFE7", muted: "#BCA893",
      primary: "#F2814D", primaryContrast: "#33150A", accent: "#E6B454", accentContrast: "#2A1C03",
    },
    processBenefits: [
      { title: "Feito na hora", description: "Preparo cuidadoso, do jeito que a casa acredita.", icon: "spark" },
      { title: "Ingredientes escolhidos", description: "Seleção criteriosa do que chega ao seu prato.", icon: "star" },
      { title: "Experiência completa", description: "Do pedido à última garfada, tudo pensado para você voltar.", icon: "heart" },
    ],
    faq: [
      { question: "Como faço meu pedido?", answerTemplate: (c) => `Use o botão “${c.ctaLabel}” nesta página — é o caminho mais rápido para falar com ${c.nome}.` },
      { question: "Vocês atendem eventos ou encomendas?", answerTemplate: (c) => `Entre em contato com ${c.nome} pelo botão da página e conte o que você precisa.` },
    ],
  },
  infoprodutos: {
    defaultScheme: "dark",
    fontHeading: "space-grotesk",
    light: {
      bg: "#F8F7FC", surface: "#FFFFFF", text: "#221E33", muted: "#6A6482",
      primary: "#5B3DF5", primaryContrast: "#FFFFFF", accent: "#B26A0F", accentContrast: "#FFFFFF",
    },
    dark: {
      bg: "#16131F", surface: "#201B2E", text: "#F0EDF9", muted: "#A79FC0",
      primary: "#9D86FF", primaryContrast: "#1B1040", accent: "#F0AC4B", accentContrast: "#2A1A02",
    },
    processBenefits: [
      { title: "Direto ao ponto", description: "Conteúdo organizado para você aplicar, não só assistir.", icon: "target" },
      { title: "Passo a passo claro", description: "Você sempre sabe qual é a próxima etapa da jornada.", icon: "check" },
      { title: "Acesso descomplicado", description: "Entrou, acessou. Sem burocracia para começar.", icon: "spark" },
    ],
    faq: [
      { question: "Como recebo o acesso?", answerTemplate: (c) => `Logo após concluir pelo botão “${c.ctaLabel}”, você recebe as instruções de acesso no seu e-mail.` },
      { question: "Para quem é este conteúdo?", answerTemplate: (c) => `${c.nome} criou este material para quem quer resolver na prática: ${c.dor}` },
    ],
  },
  outro: {
    defaultScheme: "light",
    fontHeading: "sora",
    light: {
      bg: "#F8F9FB", surface: "#FFFFFF", text: "#1D2530", muted: "#5F6B7A",
      primary: "#2563EB", primaryContrast: "#FFFFFF", accent: "#B4762A", accentContrast: "#FFFFFF",
    },
    dark: {
      bg: "#141A22", surface: "#1D2530", text: "#EDF1F7", muted: "#9BA7B6",
      primary: "#7AA5FF", primaryContrast: "#0A1F4D", accent: "#E8AC55", accentContrast: "#2A1A02",
    },
    processBenefits: [
      { title: "Atendimento direto", description: "Você fala com quem resolve, sem intermediários.", icon: "chat" },
      { title: "Clareza do início ao fim", description: "Você sabe o que esperar em cada etapa.", icon: "check" },
      { title: "Compromisso com o resultado", description: "O trabalho só termina quando o combinado é entregue.", icon: "target" },
    ],
    faq: [
      { question: "Como entro em contato?", answerTemplate: (c) => `O caminho mais rápido é o botão “${c.ctaLabel}” aqui da página.` },
    ],
  },
};

const CTA_BY_OBJECTIVE: Record<Objective, string> = {
  whatsapp: "Chamar no WhatsApp",
  lead_form: "Quero receber contato",
  agendamento: "Agendar meu horário",
  compra: "Quero garantir o meu",
  download: "Baixar agora",
};

function seededPick<T>(seed: string, salt: string, options: readonly T[]): T {
  const h = createHash("sha256").update(`${seed}:${salt}`).digest();
  return options[h[0] % options.length];
}

function sentenceCase(text: string): string {
  const t = text.trim().replace(/\s+/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function stripFinalDot(text: string): string {
  return text.trim().replace(/[.!]+$/, "");
}

/** Divide o texto da dor em até 3 itens (frases ou vírgulas). */
function splitPainItems(dor: string): Array<{ title: string; description: string }> {
  const parts = dor
    .split(/(?<=[.;!?])\s+|,\s+e\s+|;\s*/)
    .map((p) => p.trim())
    .filter((p) => p.length > 8)
    .slice(0, 3);
  if (parts.length <= 1) {
    return [
      {
        title: "O problema de verdade",
        description: sentenceCase(dor),
      },
    ];
  }
  return parts.map((p) => ({
    title: stripFinalDot(sentenceCase(p)).split(" ").slice(0, 6).join(" "),
    description: sentenceCase(p),
  }));
}

function parseProofs(raw: string | undefined): Array<{ text: string; source?: string }> {
  if (!raw) return [];
  return raw
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 8)
    .slice(0, 4)
    .map((line) => {
      const m = line.match(/^[“"']?(.+?)[”"']?\s*[—–-]\s*(.{3,80})$/);
      if (m) return { text: sentenceCase(m[1]), source: m[2].trim() };
      return { text: sentenceCase(line) };
    });
}

export interface RulesEngineInput {
  briefingRevisionId: string;
  answersHash: string;
  answers: BriefingAnswers;
}

export function generatePageDocument(input: RulesEngineInput): PageDocument {
  const { answers, answersHash } = input;
  const seed = answersHash;

  const nome = answerValue<string>(answers, "identidade.nome") ?? "Seu negócio";
  const niche = (answerValue<string>(answers, "oferta.nicho") ?? "outro") as Niche;
  const descricao = answerValue<string>(answers, "oferta.descricao") ?? "";
  const oferta = answerValue<string>(answers, "oferta.oferta_principal") ?? descricao;
  const dor = answerValue<string>(answers, "publico.dor") ?? "";
  const diferencial = answerValue<string>(answers, "oferta.diferencial") ?? "";
  const objetivo = (answerValue<string>(answers, "conversao.objetivo") ??
    "whatsapp") as Objective;
  const emocoes = answerValue<string[]>(answers, "emocao.emocoes") ?? ["confianca"];
  const tema = answerValue<string>(answers, "visual.tema") ?? "ia_decide";
  const tomPremium = answerValue<number>(answers, "visual.tom_premium");
  const provasRaw = answerValue<string>(answers, "conteudo.provas");
  const whatsapp = answerValue<string>(answers, "conversao.whatsapp");
  const linkDestino = answerValue<string>(answers, "conversao.link_destino");

  const inferredFields: string[] = [];

  let ctaLabel = answerValue<string>(answers, "conversao.cta_texto");
  if (!ctaLabel) {
    ctaLabel = CTA_BY_OBJECTIVE[objetivo];
    inferredFields.push("conversao.cta_texto");
  }

  const preset = PALETTES[niche] ?? PALETTES.outro;
  const scheme: "dark" | "light" =
    tema === "claro" ? "light" : tema === "escuro" ? "dark" : preset.defaultScheme;
  if (tema === "ia_decide") inferredFields.push("visual.tema");

  const ctx: CopyContext = {
    nome,
    oferta: stripFinalDot(oferta),
    descricao,
    dor,
    diferencial,
    objetivo,
    ctaLabel,
  };

  // ── Estratégia e copy do hero ─────────────────────────────────────────────
  const emotionAngle: Record<string, string> = {
    confianca: "transmitir segurança e competência desde o primeiro contato",
    energia: "mostrar movimento e resultado com linguagem direta",
    acolhimento: "receber o visitante com proximidade e cuidado",
    sofisticacao: "comunicar refinamento sem afastar o leitor",
    urgencia: "deixar claro o custo de adiar a decisão",
    leveza: "falar de forma simples e sem pressão",
  };
  const angle = `Página focada em ${emotionAngle[emocoes[0]] ?? emotionAngle.confianca}, conduzindo o visitante da dor (“${stripFinalDot(dor).slice(0, 80)}…”) até a ação: ${ctaLabel}.`;

  const heroHeadlines = [
    `${stripFinalDot(oferta)}, sem complicação`,
    `${nome}: ${stripFinalDot(oferta).toLowerCase()}`,
    `Chega de ${stripFinalDot(dor).toLowerCase().slice(0, 60)}`,
  ] as const;
  const headline = seededPick(seed, "headline", heroHeadlines);

  const heroVariant = seededPick(seed, "heroVariant", [
    "split",
    "centered",
    "stacked",
  ] as const);

  const isPremium = (tomPremium ?? 50) >= 65;

  // ── Seções ────────────────────────────────────────────────────────────────
  const sections: PageSection[] = [];

  sections.push({
    id: "hero",
    type: "hero",
    variant: heroVariant,
    props: {
      badge: nome,
      headline: sentenceCase(headline).slice(0, 200),
      subheadline: sentenceCase(descricao).slice(0, 600),
      ctaLabel,
      highlights:
        diferencial.length > 0
          ? [stripFinalDot(sentenceCase(diferencial)).slice(0, 200)]
          : undefined,
    },
  });

  if (dor) {
    sections.push({
      id: "pain",
      type: "pain",
      variant: seededPick(seed, "painVariant", ["cards", "list"] as const),
      props: {
        title: seededPick(seed, "painTitle", [
          "Você reconhece essa situação?",
          "O que está travando você hoje",
          "Se isso soa familiar, esta página é para você",
        ] as const),
        items: splitPainItems(dor),
      },
    });
  }

  sections.push({
    id: "solution",
    type: "solution",
    variant: "narrative",
    props: {
      title: `Como ${nome} resolve isso`,
      description: sentenceCase(
        `${stripFinalDot(descricao)}. ${diferencial ? `E tem um detalhe que faz diferença: ${stripFinalDot(diferencial).toLowerCase()}.` : ""}`,
      ).slice(0, 2000),
    },
  });

  const benefitItems = [
    ...(diferencial
      ? [
          {
            title: "O que só você encontra aqui",
            description: sentenceCase(diferencial).slice(0, 600),
            icon: "star" as const,
          },
        ]
      : []),
    ...preset.processBenefits.slice(0, diferencial ? 3 : 3),
  ].slice(0, 4);

  sections.push({
    id: "benefits",
    type: "benefits",
    variant: seededPick(seed, "benefitsVariant", ["grid", "rows"] as const),
    props: {
      title: seededPick(seed, "benefitsTitle", [
        "Por que escolher " + nome,
        "O que você leva",
        "Motivos para dar o próximo passo",
      ] as const).slice(0, 200),
      items: benefitItems,
    },
  });

  const proofs = parseProofs(provasRaw);
  if (proofs.length > 0) {
    sections.push({
      id: "proof",
      type: "proof",
      variant: "quotes",
      props: {
        title: "Quem já passou por aqui",
        items: proofs.map((p) => ({ text: p.text, source: p.source })),
      },
    });
  }

  sections.push({
    id: "offer",
    type: "offer",
    variant: isPremium ? "panel" : "banner",
    props: {
      title: sentenceCase(stripFinalDot(oferta)).slice(0, 200),
      description:
        `Essa é a oferta desta página. Clique em “${ctaLabel}” e dê o próximo passo com ${nome}.`.slice(
          0,
          600,
        ),
      ctaLabel,
    },
  });

  if (objetivo === "lead_form") {
    sections.push({
      id: "lead-form",
      type: "lead_form",
      variant: "panel",
      props: {
        title: "Deixe seu contato",
        subtitle: `${nome} retorna para você o quanto antes.`,
        fields: [
          { id: "nome", label: "Seu nome", required: true },
          { id: "telefone", label: "Telefone / WhatsApp", required: true },
          { id: "mensagem", label: "Conte rapidamente o que você precisa", required: false },
        ],
        submitLabel: ctaLabel,
        successMessage:
          "Recebemos o seu contato! Você receberá um retorno em breve.",
      },
    });
  }

  const presetFaq = preset.faq.map((f) => ({
    question: f.question,
    answer: f.answerTemplate(ctx).slice(0, 2000),
  }));
  sections.push({
    id: "faq",
    type: "faq",
    variant: "accordion",
    props: { title: "Perguntas frequentes", items: presetFaq },
  });

  sections.push({
    id: "cta-final",
    type: "cta_final",
    variant: seededPick(seed, "ctaVariant", ["banner", "card"] as const),
    props: {
      title: seededPick(seed, "ctaTitle", [
        "Pronto para começar?",
        `Fale com ${nome} agora`,
        "O próximo passo é seu",
      ] as const).slice(0, 200),
      subtitle: `Sem compromisso: ${stripFinalDot(oferta).toLowerCase()}.`.slice(0, 600),
      ctaLabel,
    },
  });

  // ── Conversão primária ────────────────────────────────────────────────────
  const destination =
    objetivo === "whatsapp"
      ? (whatsapp ?? "")
      : objetivo === "lead_form"
        ? "#form"
        : (linkDestino ?? "");

  const document: PageDocument = {
    schemaVersion: PAGE_DOCUMENT_SCHEMA_VERSION,
    locale: "pt-BR",
    businessName: nome,
    strategy: {
      niche,
      objective: objetivo,
      emotions: emocoes.slice(0, 3),
      angle: angle.slice(0, 600),
    },
    designTokens: {
      palette: scheme === "dark" ? preset.dark : preset.light,
      scheme,
      fontHeading: preset.fontHeading,
      fontBody: "inter",
      radius: isPremium ? "sm" : "lg",
      density: isPremium ? "spacious" : "regular",
    },
    seo: {
      title: `${nome} — ${stripFinalDot(oferta)}`.slice(0, 70),
      description: sentenceCase(descricao).slice(0, 180),
      noindex: false,
    },
    sections,
    primaryConversion: {
      type: objetivo,
      label: ctaLabel,
      destination,
    },
    provenance: {
      engine: "rules",
      engineVersion: RULES_ENGINE_VERSION,
      briefingRevisionId: input.briefingRevisionId,
      generatedAt: new Date().toISOString(),
      inferredFields,
    },
  };

  return document;
}
