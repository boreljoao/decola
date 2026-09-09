import { createHash } from "node:crypto";
import type { BriefingAnswers } from "@/features/briefing/questions";
import { answerValue } from "@/features/briefing/questions";
import {
  PAGE_DOCUMENT_SCHEMA_VERSION,
  type PageDocument,
  type PageSection,
} from "./page-document";
import { contrastFor, NICHE_PALETTES, type Palette } from "./palettes";

/**
 * RulesGenerationProvider — motor determinístico honesto (decisão D-006).
 * Não é mock: cada briefing produz composição, paleta e copy distintos, derivados
 * exclusivamente das respostas. Nunca inventa fatos: provas ausentes ⇒ seção
 * omitida; preços/garantias/credenciais só aparecem se informados.
 */

export const RULES_ENGINE_VERSION = "rules-1.1.0";

type Niche = PageDocument["strategy"]["niche"];
type Objective = PageDocument["strategy"]["objective"];

interface NichePreset {
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

// ── Helpers ──────────────────────────────────────────────────────────────────

function seededPick<T>(seed: string, salt: string, options: readonly T[]): T {
  const h = createHash("sha256").update(`${seed}:${salt}`).digest();
  return options[h[0] % options.length];
}

function sentenceCase(text: string): string {
  const t = text.trim().replace(/\s+/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Rebaixa só a primeira letra, preservando marcas como "WhatsApp" no meio. */
function lowerFirst(text: string): string {
  const t = text.trim();
  return t.charAt(0).toLowerCase() + t.slice(1);
}

function stripFinalDot(text: string): string {
  return text.trim().replace(/[.!]+$/, "");
}

/** Trunca em limite de palavra, sem cortar frase no meio de um termo. */
function truncateAtWord(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > max * 0.5 ? cut.slice(0, lastSpace) : cut).replace(
    /[,;:\s]+$/,
    "",
  );
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
    title: truncateAtWord(stripFinalDot(sentenceCase(p)), 42),
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

/** FAQ do usuário: uma por linha, "Pergunta? | Resposta". */
function parseCustomFaq(
  raw: string | undefined,
): Array<{ question: string; answer: string }> {
  if (!raw) return [];
  return raw
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|");
      if (parts.length >= 2) {
        return {
          question: truncateAtWord(sentenceCase(parts[0]), 180),
          answer: sentenceCase(parts.slice(1).join("|")).slice(0, 2000),
        };
      }
      return null;
    })
    .filter((x): x is { question: string; answer: string } => x !== null)
    .slice(0, 8);
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
  const slogan = answerValue<string>(answers, "identidade.slogan");
  const historia = answerValue<string>(answers, "identidade.historia");
  const niche = (answerValue<string>(answers, "oferta.nicho") ?? "outro") as Niche;
  const descricao = answerValue<string>(answers, "oferta.descricao") ?? "";
  const oferta = answerValue<string>(answers, "oferta.oferta_principal") ?? descricao;
  const precoTexto = answerValue<string>(answers, "oferta.preco_texto");
  const precoCondicao = answerValue<string>(answers, "oferta.preco_condicao");
  const garantia = answerValue<string>(answers, "oferta.garantia");
  const areaAtendida = answerValue<string>(answers, "oferta.area_atendida");
  const dor = answerValue<string>(answers, "publico.dor") ?? "";
  const desejo = answerValue<string>(answers, "publico.desejo");
  const diferencial = answerValue<string>(answers, "oferta.diferencial") ?? "";
  const objetivo = (answerValue<string>(answers, "conversao.objetivo") ??
    "whatsapp") as Objective;
  const emocoes = answerValue<string[]>(answers, "emocao.emocoes") ?? ["confianca"];
  const prioridadeHero = answerValue<string>(answers, "emocao.prioridade_hero");
  const tema = answerValue<string>(answers, "visual.tema") ?? "ia_decide";
  const corPrincipal = answerValue<string>(answers, "visual.cor_principal");
  const tipografia = answerValue<string>(answers, "visual.tipografia");
  const densidade = answerValue<string>(answers, "visual.densidade");
  const tomPremium = answerValue<number>(answers, "visual.tom_premium");
  const autoridade = answerValue<string>(answers, "conteudo.autoridade");
  const provasRaw = answerValue<string>(answers, "conteudo.provas");
  const faqRaw = answerValue<string>(answers, "conteudo.faq");
  const endereco = answerValue<string>(answers, "conteudo.endereco");
  const horarios = answerValue<string>(answers, "conteudo.horarios");
  const whatsapp = answerValue<string>(answers, "conversao.whatsapp");
  const linkDestino = answerValue<string>(answers, "conversao.link_destino");
  const formCampos = answerValue<string[]>(answers, "conversao.form_campos");

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

  // Paleta: preset do nicho, com cor de marca do usuário quando informada.
  const palettePair = NICHE_PALETTES[niche] ?? NICHE_PALETTES.outro;
  let palette: Palette = scheme === "dark" ? palettePair.dark : palettePair.light;
  if (corPrincipal) {
    const hex = `#${corPrincipal.replace("#", "").toUpperCase()}`;
    palette = {
      ...palette,
      primary: hex,
      primaryContrast: contrastFor(hex),
    };
  }

  const fontHeading =
    tipografia === "moderna"
      ? ("sora" as const)
      : tipografia === "geometrica"
        ? ("space-grotesk" as const)
        : tipografia === "neutra"
          ? ("inter" as const)
          : preset.fontHeading;
  if (!tipografia) inferredFields.push("visual.tipografia");

  const isPremium = (tomPremium ?? 50) >= 65;
  const density =
    densidade === "compacta"
      ? ("compact" as const)
      : densidade === "espacosa"
        ? ("spacious" as const)
        : densidade === "regular"
          ? ("regular" as const)
          : isPremium
            ? ("spacious" as const)
            : ("regular" as const);

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
  const angle = `Página focada em ${emotionAngle[emocoes[0]] ?? emotionAngle.confianca}, conduzindo o visitante da dor (“${truncateAtWord(stripFinalDot(dor), 80)}”) até a ação: ${ctaLabel}.`;

  const primeiraFraseDor = truncateAtWord(
    stripFinalDot(dor).split(/[.;!?]/)[0],
    70,
  );
  const heroHeadlines = [
    `${stripFinalDot(oferta)}, sem complicação`,
    `${nome} — ${stripFinalDot(oferta)}`,
    `Chega de ${lowerFirst(primeiraFraseDor)}`,
  ] as const;
  const headline = seededPick(seed, "headline", heroHeadlines);

  // Prioridade do hero informada substitui a escolha semeada.
  const heroVariant =
    prioridadeHero === "mensagem"
      ? ("centered" as const)
      : prioridadeHero === "oferta"
        ? ("split" as const)
        : prioridadeHero === "emocao"
          ? ("stacked" as const)
          : seededPick(seed, "heroVariant", ["split", "centered", "stacked"] as const);

  const subheadline = desejo
    ? `${sentenceCase(stripFinalDot(descricao))}. O destino: ${lowerFirst(stripFinalDot(desejo))}.`
    : sentenceCase(descricao);

  // ── Seções ────────────────────────────────────────────────────────────────
  const sections: PageSection[] = [];

  sections.push({
    id: "hero",
    type: "hero",
    variant: heroVariant,
    props: {
      badge: nome,
      headline: sentenceCase(headline).slice(0, 200),
      subheadline: subheadline.slice(0, 600),
      ctaLabel,
      secondaryNote: slogan ? stripFinalDot(slogan).slice(0, 200) : undefined,
      highlights:
        diferencial.length > 0
          ? [truncateAtWord(stripFinalDot(sentenceCase(diferencial)), 200)]
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
        `${stripFinalDot(descricao)}. ${
          diferencial
            ? `E tem um detalhe que faz diferença: ${lowerFirst(stripFinalDot(diferencial))}.`
            : ""
        }`,
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
    ...preset.processBenefits,
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

  // Autoridade/história: só com material verificável fornecido pelo usuário.
  const authorityText = [historia, autoridade]
    .filter((t): t is string => Boolean(t && t.trim().length > 0))
    .map((t) => sentenceCase(stripFinalDot(t)))
    .join(". ");
  if (authorityText) {
    sections.push({
      id: "authority",
      type: "authority",
      variant: "profile",
      props: {
        title: `Quem está por trás de ${nome}`,
        text: `${authorityText}.`.slice(0, 2000),
      },
    });
  }

  const offerBullets = [
    ...(garantia ? [truncateAtWord(`Garantia real: ${lowerFirst(stripFinalDot(garantia))}`, 200)] : []),
    ...(areaAtendida ? [truncateAtWord(`Atendimento: ${lowerFirst(stripFinalDot(areaAtendida))}`, 200)] : []),
  ];

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
      priceText: precoTexto ? stripFinalDot(precoTexto).slice(0, 200) : undefined,
      conditions: precoCondicao
        ? stripFinalDot(precoCondicao).slice(0, 200)
        : undefined,
      bullets: offerBullets.length > 0 ? offerBullets : undefined,
      ctaLabel,
    },
  });

  if (objetivo === "lead_form") {
    const chosen =
      formCampos && formCampos.length > 0
        ? formCampos
        : ["nome", "telefone", "mensagem"];
    if (!formCampos || formCampos.length === 0) {
      inferredFields.push("conversao.form_campos");
    }
    const labels: Record<string, string> = {
      nome: "Seu nome",
      email: "Seu e-mail",
      telefone: "Telefone / WhatsApp",
      mensagem: "Conte rapidamente o que você precisa",
    };
    sections.push({
      id: "lead-form",
      type: "lead_form",
      variant: "panel",
      props: {
        title: "Deixe seu contato",
        subtitle: `${nome} retorna para você o quanto antes.`,
        fields: chosen.map((id) => ({
          id: id as "nome" | "email" | "telefone" | "mensagem",
          label: labels[id] ?? id,
          required: id !== "mensagem",
        })),
        submitLabel: ctaLabel,
        successMessage:
          "Recebemos o seu contato! Você receberá um retorno em breve.",
      },
    });
  }

  // Contato: apenas dados reais fornecidos.
  if (endereco || horarios || areaAtendida) {
    sections.push({
      id: "contact",
      type: "contact",
      variant: "panel",
      props: {
        title: "Onde e quando",
        address: endereco ? stripFinalDot(endereco).slice(0, 600) : undefined,
        phone: objetivo === "whatsapp" && whatsapp ? whatsapp : undefined,
        hours: horarios ? stripFinalDot(horarios).slice(0, 200) : undefined,
        area: areaAtendida ? stripFinalDot(areaAtendida).slice(0, 200) : undefined,
      },
    });
  }

  const customFaq = parseCustomFaq(faqRaw);
  const presetFaq = preset.faq.map((f) => ({
    question: f.question,
    answer: f.answerTemplate(ctx).slice(0, 2000),
  }));
  const faqItems = [...customFaq, ...presetFaq].slice(0, 10);
  sections.push({
    id: "faq",
    type: "faq",
    variant: "accordion",
    props: { title: "Perguntas frequentes", items: faqItems },
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
      subtitle: `Sem compromisso: ${lowerFirst(stripFinalDot(oferta))}.`.slice(0, 600),
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
      palette,
      scheme,
      fontHeading,
      fontBody: "inter",
      radius: isPremium ? "sm" : "lg",
      density,
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
