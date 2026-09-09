import { z } from "zod";

/**
 * Contrato de perguntas do briefing (spec §7.2).
 * Cada pergunta: id, módulo, label, ajuda, tipo, validação, condição de exibição,
 * obrigatoriedade por modo e uso no motor. Respostas registram origem
 * "user" | "transcribed" | "inferred" — inferências são exibidas para confirmação.
 */

export type QuestionType =
  | "text"
  | "textarea"
  | "select"
  | "multiselect"
  | "slider"
  | "phone"
  | "url";

export type BriefingModule =
  | "identidade"
  | "oferta"
  | "publico"
  | "emocao"
  | "visual"
  | "conteudo"
  | "conversao"
  | "anuncios";

export interface QuestionOption {
  value: string;
  label: string;
  description?: string;
}

export interface QuestionDef {
  id: string;
  module: BriefingModule;
  label: string;
  help?: string;
  placeholder?: string;
  type: QuestionType;
  options?: QuestionOption[];
  /** slider */
  min?: number;
  max?: number;
  minLabel?: string;
  maxLabel?: string;
  maxSelections?: number;
  requiredIn: Array<"rapido" | "completo">;
  /** Exibida somente quando a condição vale sobre as respostas atuais. */
  showIf?: (answers: BriefingAnswers) => boolean;
  validate: z.ZodTypeAny;
  /** Pode ser inferida pelo motor no modo rápido? (nunca para preço/prova/contato) */
  inferable: boolean;
}

export type AnswerOrigin = "user" | "transcribed" | "inferred";

export interface AnswerRecord {
  value: unknown;
  origin: AnswerOrigin;
}

export type BriefingAnswers = Record<string, AnswerRecord | undefined>;

export const NICHE_OPTIONS: QuestionOption[] = [
  { value: "estetica_beleza", label: "Estética e beleza" },
  { value: "saude", label: "Saúde e bem-estar" },
  { value: "servicos_locais", label: "Serviços locais" },
  { value: "gastronomia", label: "Gastronomia" },
  { value: "infoprodutos", label: "Infoprodutos e cursos" },
  { value: "outro", label: "Outro" },
];

export const EMOTION_OPTIONS: QuestionOption[] = [
  { value: "confianca", label: "Confiança" },
  { value: "energia", label: "Energia" },
  { value: "acolhimento", label: "Acolhimento" },
  { value: "sofisticacao", label: "Sofisticação" },
  { value: "urgencia", label: "Urgência" },
  { value: "leveza", label: "Leveza" },
];

const phone = z
  .string()
  .transform((v) => v.replace(/[^\d+]/g, ""))
  .refine((v) => /^\+?[0-9]{10,15}$/.test(v), {
    message: "Informe DDD + número (ex.: 11 91234-5678).",
  });

export const QUESTIONS: QuestionDef[] = [
  {
    id: "identidade.nome",
    module: "identidade",
    label: "Qual é o nome do seu negócio?",
    help: "Exatamente como você quer que apareça na página.",
    placeholder: "Ex.: Studio Ana Lima",
    type: "text",
    requiredIn: ["rapido", "completo"],
    validate: z.string().trim().min(2).max(80),
    inferable: false,
  },
  {
    id: "oferta.nicho",
    module: "oferta",
    label: "Em qual área o seu negócio atua?",
    type: "select",
    options: NICHE_OPTIONS,
    requiredIn: ["rapido", "completo"],
    validate: z.enum([
      "estetica_beleza",
      "saude",
      "servicos_locais",
      "gastronomia",
      "infoprodutos",
      "outro",
    ]),
    inferable: false,
  },
  {
    id: "oferta.descricao",
    module: "oferta",
    label: "O que você vende ou oferece?",
    help: "Descreva com suas palavras. Quanto mais concreto, melhor a página.",
    placeholder:
      "Ex.: Atendimento de limpeza de pele e tratamentos faciais personalizados",
    type: "textarea",
    requiredIn: ["rapido", "completo"],
    validate: z.string().trim().min(10).max(600),
    inferable: false,
  },
  {
    id: "oferta.oferta_principal",
    module: "oferta",
    label: "Qual é a oferta única desta página?",
    help: "Uma página, um objetivo. Qual serviço ou produto ela deve vender?",
    placeholder: "Ex.: Avaliação facial gratuita na primeira visita",
    type: "text",
    requiredIn: ["rapido", "completo"],
    validate: z.string().trim().min(5).max(200),
    inferable: false,
  },
  {
    id: "publico.dor",
    module: "publico",
    label: "Qual é o principal problema que o seu cliente quer resolver?",
    help: "O que incomoda, atrapalha ou preocupa quem procura você?",
    placeholder:
      "Ex.: Pele oleosa e marcas de acne que abalam a autoconfiança",
    type: "textarea",
    requiredIn: ["rapido", "completo"],
    validate: z.string().trim().min(10).max(600),
    inferable: false,
  },
  {
    id: "publico.cliente_ideal",
    module: "publico",
    label: "Quem é o seu cliente ideal?",
    placeholder: "Ex.: Mulheres de 25 a 45 anos da região de Campinas",
    type: "text",
    requiredIn: ["completo"],
    validate: z.string().trim().min(3).max(300),
    inferable: true,
  },
  {
    id: "oferta.diferencial",
    module: "oferta",
    label: "O que torna o seu negócio diferente dos concorrentes?",
    help: "Apenas diferenciais verdadeiros e verificáveis — nada será inventado.",
    placeholder: "Ex.: 12 anos de experiência e protocolo exclusivo de avaliação",
    type: "textarea",
    requiredIn: ["rapido", "completo"],
    validate: z.string().trim().min(5).max(600),
    inferable: false,
  },
  {
    id: "conversao.objetivo",
    module: "conversao",
    label: "O que a página deve fazer o visitante realizar?",
    help: "Toda página Decola tem um objetivo primário único.",
    type: "select",
    options: [
      { value: "whatsapp", label: "Chamar no WhatsApp" },
      { value: "lead_form", label: "Preencher um formulário de contato" },
      { value: "agendamento", label: "Agendar um horário (link externo)" },
      { value: "compra", label: "Comprar (checkout externo)" },
      { value: "download", label: "Baixar um material" },
    ],
    requiredIn: ["rapido", "completo"],
    validate: z.enum([
      "whatsapp",
      "lead_form",
      "agendamento",
      "compra",
      "download",
    ]),
    inferable: false,
  },
  {
    id: "conversao.whatsapp",
    module: "conversao",
    label: "Qual é o número de WhatsApp do negócio?",
    help: "Com DDD. Usaremos para o botão de conversa.",
    placeholder: "Ex.: (11) 91234-5678",
    type: "phone",
    requiredIn: ["rapido", "completo"],
    showIf: (a) => a["conversao.objetivo"]?.value === "whatsapp",
    validate: phone,
    inferable: false,
  },
  {
    id: "conversao.link_destino",
    module: "conversao",
    label: "Qual é o link de destino?",
    help: "Link https do seu sistema de agenda, checkout ou material.",
    placeholder: "https://…",
    type: "url",
    requiredIn: ["rapido", "completo"],
    showIf: (a) =>
      ["agendamento", "compra", "download"].includes(
        String(a["conversao.objetivo"]?.value ?? ""),
      ),
    validate: z.string().url().startsWith("https://", {
      message: "O destino precisa ser um link https://.",
    }),
    inferable: false,
  },
  {
    id: "conversao.cta_texto",
    module: "conversao",
    label: "Texto do botão principal (opcional)",
    help: "Se deixar em branco, sugerimos um de acordo com o objetivo.",
    placeholder: "Ex.: Quero agendar minha avaliação",
    type: "text",
    requiredIn: [],
    validate: z.string().trim().min(2).max(60).optional(),
    inferable: true,
  },
  {
    id: "emocao.emocoes",
    module: "emocao",
    label: "Que sensações a página deve transmitir? (até 3)",
    type: "multiselect",
    options: EMOTION_OPTIONS,
    maxSelections: 3,
    requiredIn: ["rapido", "completo"],
    validate: z.array(z.string()).min(1).max(3),
    inferable: false,
  },
  {
    id: "visual.tema",
    module: "visual",
    label: "Você prefere um visual claro ou escuro?",
    type: "select",
    options: [
      { value: "claro", label: "Claro" },
      { value: "escuro", label: "Escuro" },
      { value: "ia_decide", label: "Deixar a Decola decidir" },
    ],
    requiredIn: ["rapido", "completo"],
    validate: z.enum(["claro", "escuro", "ia_decide"]),
    inferable: false,
  },
  {
    id: "visual.tom_serio",
    module: "visual",
    label: "Tom da comunicação",
    type: "slider",
    min: 0,
    max: 100,
    minLabel: "Divertido",
    maxLabel: "Sério",
    requiredIn: [],
    validate: z.number().min(0).max(100).optional(),
    inferable: true,
  },
  {
    id: "visual.tom_premium",
    module: "visual",
    label: "Posicionamento",
    type: "slider",
    min: 0,
    max: 100,
    minLabel: "Popular e acessível",
    maxLabel: "Premium",
    requiredIn: [],
    validate: z.number().min(0).max(100).optional(),
    inferable: true,
  },
  {
    id: "conteudo.provas",
    module: "conteudo",
    label: "Você tem provas reais que podemos mostrar? (opcional)",
    help:
      "Depoimentos com autorização, números reais, certificações. " +
      "Sem provas, a seção é omitida — nada é inventado.",
    placeholder: "Ex.: “Melhor atendimento da região” — Juliana P., cliente desde 2023",
    type: "textarea",
    requiredIn: [],
    validate: z.string().trim().max(1200).optional(),
    inferable: false,
  },
];

export function visibleQuestions(
  mode: "rapido" | "completo",
  answers: BriefingAnswers,
): QuestionDef[] {
  return QUESTIONS.filter((q) => {
    if (mode === "rapido") {
      const inQuickFlow =
        q.requiredIn.includes("rapido") || q.requiredIn.length === 0;
      if (!inQuickFlow) return false;
    }
    if (q.showIf && !q.showIf(answers)) return false;
    return true;
  });
}

/**
 * Valida um conjunto de respostas para conclusão do briefing.
 * Campo oculto por condição não contamina o resultado (é removido).
 */
export function validateForCompletion(
  mode: "rapido" | "completo",
  answers: BriefingAnswers,
):
  | { ok: true; cleaned: BriefingAnswers }
  | { ok: false; missing: string[]; invalid: Array<{ id: string; message: string }> } {
  const visible = visibleQuestions(mode, answers);
  const visibleIds = new Set(visible.map((q) => q.id));
  const cleaned: BriefingAnswers = {};
  const missing: string[] = [];
  const invalid: Array<{ id: string; message: string }> = [];

  for (const q of visible) {
    const record = answers[q.id];
    const required = q.requiredIn.includes(mode);
    if (record == null || record.value == null || record.value === "") {
      if (required) missing.push(q.id);
      continue;
    }
    const parsed = q.validate.safeParse(record.value);
    if (!parsed.success) {
      invalid.push({
        id: q.id,
        message: parsed.error.issues[0]?.message ?? "Valor inválido.",
      });
      continue;
    }
    cleaned[q.id] = { value: parsed.data, origin: record.origin };
  }

  // remove respostas de perguntas não visíveis (ex.: mudou de objetivo)
  for (const key of Object.keys(answers)) {
    if (!visibleIds.has(key)) continue;
  }

  if (missing.length > 0 || invalid.length > 0) {
    return { ok: false, missing, invalid };
  }
  return { ok: true, cleaned };
}

export function answerValue<T = unknown>(
  answers: BriefingAnswers,
  id: string,
): T | undefined {
  return answers[id]?.value as T | undefined;
}
