import type {
  PageDocument,
  PageSection,
  SectionType,
} from "@/features/generation/page-document";

/**
 * Configuração do editor manual (spec §9): quais campos de cada seção são
 * editáveis, limites de listas e modelos para adicionar novas seções.
 * O renderer continua sendo a única autoridade de composição — aqui só se
 * descrevem props já validadas pelo schema do PageDocument.
 */

export interface SimpleFieldDef {
  key: string;
  label: string;
  kind: "text" | "textarea";
  optional?: boolean;
}

export interface ListFieldDef {
  key: string;
  label: string;
  itemFields: SimpleFieldDef[];
  min: number;
  max: number;
  newItem: Record<string, unknown>;
}

export interface ImageFieldDef {
  key: string;
  label: string;
  hint?: string;
}

export interface SectionFieldConfig {
  title: string;
  variants: readonly string[];
  simple: SimpleFieldDef[];
  lists?: ListFieldDef[];
  /** Campos de imagem (asset do próprio workspace). */
  images?: ImageFieldDef[];
}

export const SECTION_FIELDS: Record<SectionType, SectionFieldConfig> = {
  hero: {
    title: "Herói (topo)",
    variants: ["split", "centered", "stacked"],
    simple: [
      { key: "badge", label: "Selo (nome/etiqueta)", kind: "text", optional: true },
      { key: "headline", label: "Título principal", kind: "textarea" },
      { key: "subheadline", label: "Subtítulo", kind: "textarea" },
      { key: "ctaLabel", label: "Texto do botão", kind: "text" },
      { key: "secondaryNote", label: "Nota secundária", kind: "text", optional: true },
    ],
    lists: [
      {
        key: "highlights",
        label: "Destaques",
        itemFields: [],
        min: 0,
        max: 4,
        newItem: {},
      },
    ],
    images: [
      {
        key: "image",
        label: "Imagem do topo",
        hint: "Aparece ao lado da mensagem. Sem imagem, os destaques ocupam esse espaço.",
      },
    ],
  },
  pain: {
    title: "Dor",
    variants: ["cards", "list"],
    simple: [
      { key: "title", label: "Título", kind: "text" },
      { key: "intro", label: "Introdução", kind: "textarea", optional: true },
    ],
    lists: [
      {
        key: "items",
        label: "Itens de dor",
        itemFields: [
          { key: "title", label: "Título", kind: "text" },
          { key: "description", label: "Descrição", kind: "textarea" },
        ],
        min: 1,
        max: 4,
        newItem: { title: "Nova dor", description: "Descreva a situação." },
      },
    ],
  },
  solution: {
    title: "Solução",
    variants: ["narrative", "steps"],
    simple: [
      { key: "title", label: "Título", kind: "text" },
      { key: "description", label: "Descrição", kind: "textarea" },
    ],
  },
  benefits: {
    title: "Benefícios",
    variants: ["grid", "rows"],
    simple: [{ key: "title", label: "Título", kind: "text" }],
    lists: [
      {
        key: "items",
        label: "Benefícios",
        itemFields: [
          { key: "title", label: "Título", kind: "text" },
          { key: "description", label: "Descrição", kind: "textarea" },
        ],
        min: 2,
        max: 6,
        newItem: { title: "Novo benefício", description: "Descreva o benefício.", icon: "check" },
      },
    ],
  },
  proof: {
    title: "Provas",
    variants: ["quotes", "facts"],
    simple: [{ key: "title", label: "Título", kind: "text" }],
    lists: [
      {
        key: "items",
        label: "Provas (somente reais)",
        itemFields: [
          { key: "text", label: "Texto", kind: "textarea" },
          { key: "source", label: "Fonte/autor", kind: "text", optional: true },
        ],
        min: 1,
        max: 6,
        newItem: { text: "Depoimento real, com autorização." },
      },
    ],
  },
  authority: {
    title: "Autoridade",
    variants: ["profile", "compact"],
    simple: [
      { key: "title", label: "Título", kind: "text" },
      { key: "text", label: "Texto", kind: "textarea" },
    ],
    images: [{ key: "image", label: "Foto", hint: "Foto de quem atende." }],
  },
  offer: {
    title: "Oferta",
    variants: ["panel", "banner"],
    simple: [
      { key: "title", label: "Título", kind: "text" },
      { key: "description", label: "Descrição", kind: "textarea" },
      { key: "priceText", label: "Preço (texto)", kind: "text", optional: true },
      { key: "conditions", label: "Condições", kind: "text", optional: true },
      { key: "ctaLabel", label: "Texto do botão", kind: "text" },
    ],
    lists: [
      {
        key: "bullets",
        label: "Itens da oferta",
        itemFields: [],
        min: 0,
        max: 6,
        newItem: {},
      },
    ],
  },
  faq: {
    title: "Perguntas frequentes",
    variants: ["accordion"],
    simple: [{ key: "title", label: "Título", kind: "text" }],
    lists: [
      {
        key: "items",
        label: "Perguntas",
        itemFields: [
          { key: "question", label: "Pergunta", kind: "text" },
          { key: "answer", label: "Resposta", kind: "textarea" },
        ],
        min: 1,
        max: 10,
        newItem: { question: "Nova pergunta?", answer: "Resposta." },
      },
    ],
  },
  contact: {
    title: "Contato e localização",
    variants: ["panel"],
    simple: [
      { key: "title", label: "Título", kind: "text" },
      { key: "address", label: "Endereço", kind: "text", optional: true },
      { key: "phone", label: "Telefone", kind: "text", optional: true },
      { key: "hours", label: "Horários", kind: "text", optional: true },
      { key: "area", label: "Área atendida", kind: "text", optional: true },
    ],
  },
  lead_form: {
    title: "Formulário de contato",
    variants: ["panel", "inline"],
    simple: [
      { key: "title", label: "Título", kind: "text" },
      { key: "subtitle", label: "Subtítulo", kind: "text", optional: true },
      { key: "submitLabel", label: "Texto do botão", kind: "text" },
      { key: "successMessage", label: "Mensagem de sucesso", kind: "textarea" },
    ],
  },
  cta_final: {
    title: "Chamada final",
    variants: ["banner", "card"],
    simple: [
      { key: "title", label: "Título", kind: "text" },
      { key: "subtitle", label: "Subtítulo", kind: "textarea", optional: true },
      { key: "ctaLabel", label: "Texto do botão", kind: "text" },
    ],
  },
};

/** Seções que podem ser adicionadas pelo editor (com props iniciais válidas). */
export function makeSection(
  type: SectionType,
  doc: PageDocument,
): PageSection | null {
  const id = `${type}-${Math.random().toString(36).slice(2, 6)}`;
  const cta = doc.primaryConversion.label;
  switch (type) {
    case "pain":
      return {
        id, type, variant: "cards",
        props: { title: "O que está travando você hoje", items: [{ title: "Descreva a dor", description: "Edite este texto com a situação real do seu cliente." }] },
      };
    case "solution":
      return { id, type, variant: "narrative", props: { title: "Como resolvemos", description: "Descreva como o seu trabalho resolve o problema." } };
    case "benefits":
      return {
        id, type, variant: "grid",
        props: { title: "O que você leva", items: [
          { title: "Benefício 1", description: "Descreva o benefício.", icon: "check" },
          { title: "Benefício 2", description: "Descreva o benefício.", icon: "star" },
        ] },
      };
    case "proof":
      return { id, type, variant: "quotes", props: { title: "Quem já passou por aqui", items: [{ text: "Use somente depoimentos reais e autorizados." }] } };
    case "authority":
      return { id, type, variant: "profile", props: { title: "Quem está por trás", text: "Conte sua experiência e credenciais verificáveis." } };
    case "offer":
      return { id, type, variant: "panel", props: { title: "Sua oferta", description: `Clique em “${cta}” e dê o próximo passo.`, ctaLabel: cta } };
    case "faq":
      return { id, type, variant: "accordion", props: { title: "Perguntas frequentes", items: [{ question: "Nova pergunta?", answer: "Resposta." }] } };
    case "contact":
      return { id, type, variant: "panel", props: { title: "Onde e quando" } };
    case "cta_final":
      return { id, type, variant: "banner", props: { title: "Pronto para começar?", ctaLabel: cta } };
    default:
      // hero e lead_form são únicos e estruturais — não são adicionáveis aqui.
      return null;
  }
}

export const ADDABLE_TYPES: SectionType[] = [
  "pain",
  "solution",
  "benefits",
  "proof",
  "authority",
  "offer",
  "faq",
  "contact",
  "cta_final",
];
