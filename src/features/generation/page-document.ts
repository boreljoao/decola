import { z } from "zod";

/**
 * PageDocument v1 (spec §8.2): contrato entre o motor de geração e o renderer.
 * O renderer só monta componentes do catálogo permitido com props validadas —
 * nunca HTML/JS arbitrário vindo de LLM ou usuário.
 */

export const PAGE_DOCUMENT_SCHEMA_VERSION = 1;

// Links aceitam apenas protocolos seguros (spec §8.2).
const safeUrl = z
  .string()
  .max(2048)
  .refine(
    (v) =>
      v.startsWith("https://") ||
      v.startsWith("http://") ||
      v.startsWith("mailto:") ||
      v.startsWith("tel:") ||
      v.startsWith("#"),
    { message: "Destino deve usar http(s), mailto:, tel: ou âncora." },
  );

const shortText = z.string().min(1).max(200);
const mediumText = z.string().min(1).max(600);
const longText = z.string().min(1).max(2000);

export const paletteSchema = z.object({
  bg: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  surface: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  text: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  muted: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  primary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  primaryContrast: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  accentContrast: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

/**
 * Referência a um asset do próprio workspace. Guardamos apenas o id: a URL é
 * derivada pelo renderer (`/api/assets/<id>`), então nem o LLM nem o editor
 * conseguem injetar uma URL externa arbitrária.
 */
export const imageRefSchema = z.object({
  assetId: z.string().uuid(),
  alt: z.string().max(200),
  width: z.number().int().positive().max(6000),
  height: z.number().int().positive().max(6000),
  /** Ponto focal 0–1 para enquadramento em recortes (object-position). */
  focalX: z.number().min(0).max(1).optional(),
  focalY: z.number().min(0).max(1).optional(),
});

export type ImageRef = z.infer<typeof imageRefSchema>;

export const designTokensSchema = z.object({
  palette: paletteSchema,
  scheme: z.enum(["dark", "light"]),
  fontHeading: z.enum(["sora", "space-grotesk", "inter"]),
  fontBody: z.enum(["inter"]),
  radius: z.enum(["sm", "md", "lg", "xl"]),
  density: z.enum(["compact", "regular", "spacious"]),
});

export const conversionSchema = z.object({
  type: z.enum(["whatsapp", "lead_form", "agendamento", "compra", "download"]),
  label: shortText,
  /**
   * whatsapp → número E.164; lead_form → "#form"; demais → URL https validada.
   */
  destination: z.string().min(1).max(2048),
});

// ── Seções (catálogo permitido) ──────────────────────────────────────────────

const heroSection = z.object({
  id: z.string().min(1).max(64),
  type: z.literal("hero"),
  variant: z.enum(["split", "centered", "stacked"]),
  props: z.object({
    badge: shortText.optional(),
    headline: shortText,
    subheadline: mediumText,
    ctaLabel: shortText,
    secondaryNote: shortText.optional(),
    highlights: z.array(shortText).max(4).optional(),
    image: imageRefSchema.optional(),
  }),
});

const painSection = z.object({
  id: z.string().min(1).max(64),
  type: z.literal("pain"),
  variant: z.enum(["cards", "list"]),
  props: z.object({
    title: shortText,
    intro: mediumText.optional(),
    items: z
      .array(z.object({ title: shortText, description: mediumText }))
      .min(1)
      .max(4),
  }),
});

const solutionSection = z.object({
  id: z.string().min(1).max(64),
  type: z.literal("solution"),
  variant: z.enum(["narrative", "steps"]),
  props: z.object({
    title: shortText,
    description: longText,
    steps: z
      .array(z.object({ title: shortText, description: mediumText }))
      .max(5)
      .optional(),
  }),
});

const benefitsSection = z.object({
  id: z.string().min(1).max(64),
  type: z.literal("benefits"),
  variant: z.enum(["grid", "rows"]),
  props: z.object({
    title: shortText,
    items: z
      .array(
        z.object({
          title: shortText,
          description: mediumText,
          icon: z
            .enum([
              "spark",
              "shield",
              "clock",
              "heart",
              "target",
              "star",
              "chat",
              "check",
            ])
            .optional(),
        }),
      )
      .min(2)
      .max(6),
  }),
});

/** Somente provas reais do briefing; prova ausente ⇒ seção omitida (spec §7.2/§8.4). */
const proofSection = z.object({
  id: z.string().min(1).max(64),
  type: z.literal("proof"),
  variant: z.enum(["quotes", "facts"]),
  props: z.object({
    title: shortText,
    items: z
      .array(z.object({ text: mediumText, source: shortText.optional() }))
      .min(1)
      .max(6),
  }),
});

const authoritySection = z.object({
  id: z.string().min(1).max(64),
  type: z.literal("authority"),
  variant: z.enum(["profile", "compact"]),
  props: z.object({
    title: shortText,
    text: longText,
    credentials: z.array(shortText).max(6).optional(),
    image: imageRefSchema.optional(),
  }),
});

const offerSection = z.object({
  id: z.string().min(1).max(64),
  type: z.literal("offer"),
  variant: z.enum(["panel", "banner"]),
  props: z.object({
    title: shortText,
    description: mediumText,
    priceText: shortText.optional(),
    conditions: shortText.optional(),
    bullets: z.array(shortText).max(6).optional(),
    ctaLabel: shortText,
  }),
});

const faqSection = z.object({
  id: z.string().min(1).max(64),
  type: z.literal("faq"),
  variant: z.enum(["accordion"]),
  props: z.object({
    title: shortText,
    items: z
      .array(z.object({ question: shortText, answer: longText }))
      .min(1)
      .max(10),
  }),
});

const contactSection = z.object({
  id: z.string().min(1).max(64),
  type: z.literal("contact"),
  variant: z.enum(["panel"]),
  props: z.object({
    title: shortText,
    address: mediumText.optional(),
    phone: shortText.optional(),
    hours: shortText.optional(),
    area: shortText.optional(),
  }),
});

const leadFormSection = z.object({
  id: z.string().min(1).max(64),
  type: z.literal("lead_form"),
  variant: z.enum(["panel", "inline"]),
  props: z.object({
    title: shortText,
    subtitle: mediumText.optional(),
    fields: z
      .array(
        z.object({
          id: z.enum(["nome", "email", "telefone", "mensagem"]),
          label: shortText,
          required: z.boolean(),
        }),
      )
      .min(1)
      .max(4),
    submitLabel: shortText,
    successMessage: mediumText,
  }),
});

const ctaFinalSection = z.object({
  id: z.string().min(1).max(64),
  type: z.literal("cta_final"),
  variant: z.enum(["banner", "card"]),
  props: z.object({
    title: shortText,
    subtitle: mediumText.optional(),
    ctaLabel: shortText,
  }),
});

export const sectionSchema = z.discriminatedUnion("type", [
  heroSection,
  painSection,
  solutionSection,
  benefitsSection,
  proofSection,
  authoritySection,
  offerSection,
  faqSection,
  contactSection,
  leadFormSection,
  ctaFinalSection,
]);

export type PageSection = z.infer<typeof sectionSchema>;
export type SectionType = PageSection["type"];

// ── Documento ────────────────────────────────────────────────────────────────

export const pageDocumentSchema = z.object({
  schemaVersion: z.literal(PAGE_DOCUMENT_SCHEMA_VERSION),
  locale: z.literal("pt-BR"),
  businessName: shortText,
  /** Logo enviada pelo usuário; ausente ⇒ tratamento tipográfico do nome. */
  logo: imageRefSchema.optional(),
  strategy: z.object({
    niche: z.enum([
      "estetica_beleza",
      "saude",
      "servicos_locais",
      "gastronomia",
      "infoprodutos",
      "outro",
    ]),
    objective: z.enum([
      "whatsapp",
      "lead_form",
      "agendamento",
      "compra",
      "download",
    ]),
    emotions: z.array(z.string().max(40)).max(3),
    angle: mediumText,
  }),
  designTokens: designTokensSchema,
  seo: z.object({
    title: z.string().min(1).max(70),
    description: z.string().min(1).max(180),
    noindex: z.boolean(),
  }),
  sections: z.array(sectionSchema).min(3).max(14),
  primaryConversion: conversionSchema,
  provenance: z.object({
    engine: z.enum(["rules", "anthropic"]),
    engineVersion: z.string().max(40),
    briefingRevisionId: z.string().uuid(),
    generatedAt: z.string(),
    inferredFields: z.array(z.string().max(80)),
  }),
});

export type PageDocument = z.infer<typeof pageDocumentSchema>;

export function validatePageDocument(input: unknown):
  | { ok: true; document: PageDocument }
  | { ok: false; issues: string[] } {
  const parsed = pageDocumentSchema.safeParse(input);
  if (parsed.success) {
    const doc = parsed.data;
    const issues: string[] = [];
    // Regras além do schema: ids únicos e destino coerente com o objetivo.
    const ids = new Set<string>();
    for (const s of doc.sections) {
      if (ids.has(s.id)) issues.push(`Seção com id duplicado: ${s.id}`);
      ids.add(s.id);
    }
    const conv = doc.primaryConversion;
    if (conv.type === "whatsapp" && !/^\+?[0-9]{10,15}$/.test(conv.destination)) {
      issues.push("Conversão WhatsApp exige telefone válido (DDI+DDD+número).");
    }
    if (
      ["agendamento", "compra", "download"].includes(conv.type) &&
      !conv.destination.startsWith("https://")
    ) {
      issues.push(`Conversão ${conv.type} exige destino https://.`);
    }
    if (conv.type === "lead_form" && !doc.sections.some((s) => s.type === "lead_form")) {
      issues.push("Objetivo lead_form exige uma seção lead_form na página.");
    }
    if (issues.length > 0) return { ok: false, issues };
    return { ok: true, document: doc };
  }
  return {
    ok: false,
    issues: parsed.error.issues.map(
      (i) => `${i.path.join(".")}: ${i.message}`,
    ),
  };
}

const safeUrlSchema = safeUrl;
export { safeUrlSchema };
