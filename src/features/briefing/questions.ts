import { z } from "zod";

/**
 * Contrato de perguntas do briefing (spec §7.2) — 8 módulos.
 * Cada pergunta: id, módulo, label, ajuda, tipo, validação, condição de exibição,
 * obrigatoriedade por modo e uso no motor. Respostas registram origem
 * "user" | "transcribed" | "inferred" — inferências são exibidas para confirmação.
 *
 * Modo rápido: somente perguntas com `quickFlow` (essenciais + opcionais curtas).
 * Modo completo: todas, na ordem dos módulos.
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

export const MODULE_LABELS: Record<BriefingModule, string> = {
  identidade: "Identidade",
  oferta: "Oferta",
  publico: "Público",
  emocao: "Emoção",
  visual: "Visual",
  conteudo: "Conteúdo",
  conversao: "Conversão",
  anuncios: "Anúncios",
};

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
  /** Participa do fluxo do modo rápido. */
  quickFlow?: boolean;
  /** Exibida somente quando a condição vale sobre as respostas atuais. */
  showIf?: (answers: BriefingAnswers) => boolean;
  validate: z.ZodTypeAny;
  /** Pode ser inferida pelo motor? (nunca para preço/prova/contato/credenciais) */
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

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal(""));

const hasPlatforms = (a: BriefingAnswers) => {
  const v = a["anuncios.plataformas"]?.value;
  return Array.isArray(v) && v.length > 0;
};

export const QUESTIONS: QuestionDef[] = [
  // ── Módulo 1 · Identidade ──────────────────────────────────────────────────
  {
    id: "identidade.nome",
    module: "identidade",
    label: "Qual é o nome do seu negócio?",
    help: "Exatamente como você quer que apareça na página.",
    placeholder: "Ex.: Studio Ana Lima",
    type: "text",
    requiredIn: ["rapido", "completo"],
    quickFlow: true,
    validate: z.string().trim().min(2).max(80),
    inferable: false,
  },
  {
    id: "identidade.slogan",
    module: "identidade",
    label: "Seu negócio tem um slogan? (opcional)",
    placeholder: "Ex.: Cuidar da pele é cuidar de você",
    type: "text",
    requiredIn: [],
    validate: optionalText(120),
    inferable: false,
  },
  {
    id: "identidade.historia",
    module: "identidade",
    label: "Conte em poucas linhas a história do seu negócio (opcional)",
    help: "Como começou, há quanto tempo existe, o que move você.",
    type: "textarea",
    requiredIn: [],
    validate: optionalText(1200),
    inferable: false,
  },
  {
    id: "visual.tom_serio",
    module: "identidade",
    label: "Tom da comunicação",
    type: "slider",
    min: 0,
    max: 100,
    minLabel: "Divertido",
    maxLabel: "Sério",
    requiredIn: [],
    quickFlow: true,
    validate: z.number().min(0).max(100).optional(),
    inferable: true,
  },
  {
    id: "visual.tom_premium",
    module: "identidade",
    label: "Posicionamento",
    type: "slider",
    min: 0,
    max: 100,
    minLabel: "Popular e acessível",
    maxLabel: "Premium",
    requiredIn: [],
    quickFlow: true,
    validate: z.number().min(0).max(100).optional(),
    inferable: true,
  },

  // ── Módulo 2 · Oferta ──────────────────────────────────────────────────────
  {
    id: "oferta.nicho",
    module: "oferta",
    label: "Em qual área o seu negócio atua?",
    type: "select",
    options: NICHE_OPTIONS,
    requiredIn: ["rapido", "completo"],
    quickFlow: true,
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
    quickFlow: true,
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
    quickFlow: true,
    validate: z.string().trim().min(5).max(200),
    inferable: false,
  },
  {
    id: "oferta.preco_texto",
    module: "oferta",
    label: "Quer exibir o preço na página? Se sim, qual? (opcional)",
    help: "Só será exibido se você informar aqui. Nunca inventamos preço.",
    placeholder: "Ex.: R$ 180 por sessão",
    type: "text",
    requiredIn: [],
    validate: optionalText(80),
    inferable: false,
  },
  {
    id: "oferta.preco_condicao",
    module: "oferta",
    label: "Alguma condição junto ao preço? (opcional)",
    placeholder: "Ex.: a partir de / na primeira visita / à vista",
    type: "text",
    requiredIn: [],
    showIf: (a) => Boolean(a["oferta.preco_texto"]?.value),
    validate: optionalText(120),
    inferable: false,
  },
  {
    id: "oferta.diferencial",
    module: "oferta",
    label: "O que torna o seu negócio diferente dos concorrentes?",
    help: "Apenas diferenciais verdadeiros e verificáveis — nada será inventado.",
    placeholder: "Ex.: 12 anos de experiência e protocolo exclusivo de avaliação",
    type: "textarea",
    requiredIn: ["rapido", "completo"],
    quickFlow: true,
    validate: z.string().trim().min(5).max(600),
    inferable: false,
  },
  {
    id: "oferta.garantia",
    module: "oferta",
    label: "Você oferece alguma garantia real? (opcional)",
    help: "Somente garantias que você realmente cumpre. Sem garantia, a página não menciona nenhuma.",
    placeholder: "Ex.: Reembolso em 7 dias se não gostar da primeira sessão",
    type: "text",
    requiredIn: [],
    validate: optionalText(300),
    inferable: false,
  },
  {
    id: "oferta.area_atendida",
    module: "oferta",
    label: "Qual área ou região você atende? (opcional)",
    placeholder: "Ex.: Campinas e região, atendimento também online",
    type: "text",
    requiredIn: [],
    validate: optionalText(200),
    inferable: false,
  },
  {
    id: "oferta.restricoes",
    module: "oferta",
    label: "Alguma restrição importante da oferta? (opcional)",
    help: "Ex.: público mínimo de idade, agenda limitada, condições especiais.",
    type: "textarea",
    requiredIn: [],
    validate: optionalText(400),
    inferable: false,
  },

  // ── Módulo 3 · Público ─────────────────────────────────────────────────────
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
    id: "publico.dor",
    module: "publico",
    label: "Qual é o principal problema que o seu cliente quer resolver?",
    help: "O que incomoda, atrapalha ou preocupa quem procura você?",
    placeholder:
      "Ex.: Pele oleosa e marcas de acne que abalam a autoconfiança",
    type: "textarea",
    requiredIn: ["rapido", "completo"],
    quickFlow: true,
    validate: z.string().trim().min(10).max(600),
    inferable: false,
  },
  {
    id: "publico.desejo",
    module: "publico",
    label: "E o que essa pessoa deseja alcançar?",
    help: "O resultado que ela imagina quando o problema estiver resolvido.",
    placeholder: "Ex.: Sair de casa sem maquiagem, com a pele saudável",
    type: "textarea",
    requiredIn: ["completo"],
    validate: z.string().trim().min(5).max(600),
    inferable: true,
  },
  {
    id: "publico.objecoes",
    module: "publico",
    label: "Que dúvidas ou receios costumam impedir a compra? (opcional)",
    placeholder: "Ex.: “Será que funciona para o meu caso?”, preço, tempo",
    type: "textarea",
    requiredIn: [],
    validate: optionalText(600),
    inferable: false,
  },
  {
    id: "publico.tentativas",
    module: "publico",
    label: "O que seu cliente já tentou antes de chegar até você? (opcional)",
    placeholder: "Ex.: Produtos de farmácia, receitas da internet",
    type: "textarea",
    requiredIn: [],
    validate: optionalText(600),
    inferable: false,
  },
  {
    id: "publico.consciencia",
    module: "publico",
    label: "Quanto seu cliente conhece esse tipo de solução?",
    type: "select",
    options: [
      { value: "nao_conhece", label: "Nem sabe que existe solução" },
      { value: "conhece_problema", label: "Sente o problema, não conhece soluções" },
      { value: "compara", label: "Já compara soluções e fornecedores" },
      { value: "pronto", label: "Já decidiu, só precisa de um empurrão" },
    ],
    requiredIn: [],
    validate: z.enum(["nao_conhece", "conhece_problema", "compara", "pronto"]).optional(),
    inferable: true,
  },

  // ── Módulo 4 · Emoção ──────────────────────────────────────────────────────
  {
    id: "emocao.emocoes",
    module: "emocao",
    label: "Que sensações a página deve transmitir? (até 3)",
    type: "multiselect",
    options: EMOTION_OPTIONS,
    maxSelections: 3,
    requiredIn: ["rapido", "completo"],
    quickFlow: true,
    validate: z.array(z.string()).min(1).max(3),
    inferable: false,
  },
  {
    id: "emocao.prioridade_hero",
    module: "emocao",
    label: "O topo da página deve priorizar o quê?",
    type: "select",
    options: [
      { value: "mensagem", label: "Mensagem direta e clara" },
      { value: "emocao", label: "Clima e emoção" },
      { value: "oferta", label: "A oferta em destaque" },
    ],
    requiredIn: [],
    validate: z.enum(["mensagem", "emocao", "oferta"]).optional(),
    inferable: true,
  },
  {
    id: "emocao.movimento",
    module: "emocao",
    label: "Quanta animação a página deve ter?",
    type: "select",
    options: [
      { value: "sutil", label: "Sutil — quase estática" },
      { value: "moderado", label: "Moderada" },
      { value: "expressivo", label: "Expressiva — com movimento marcante" },
    ],
    requiredIn: [],
    validate: z.enum(["sutil", "moderado", "expressivo"]).optional(),
    inferable: true,
  },
  {
    id: "emocao.referencias_admiradas",
    module: "emocao",
    label: "Até 3 sites ou marcas que você admira (opcional)",
    help: "Nomes ou links, um por linha, com o porquê. Usamos como referência de estilo — nunca copiamos.",
    type: "textarea",
    requiredIn: [],
    validate: optionalText(600),
    inferable: false,
  },
  {
    id: "emocao.referencias_rejeitadas",
    module: "emocao",
    label: "Até 3 estilos que você NÃO quer (opcional)",
    placeholder: "Ex.: Nada de visual “promoção de loja de eletrônico”",
    type: "textarea",
    requiredIn: [],
    validate: optionalText(600),
    inferable: false,
  },

  // ── Módulo 5 · Visual ──────────────────────────────────────────────────────
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
    quickFlow: true,
    validate: z.enum(["claro", "escuro", "ia_decide"]),
    inferable: false,
  },
  {
    id: "visual.cor_principal",
    module: "visual",
    label: "Sua marca já tem uma cor principal? (opcional)",
    help: "Informe o código hex (ex.: #7A1FA2). Ajustamos o restante da paleta para manter contraste e legibilidade.",
    placeholder: "#7A1FA2",
    type: "text",
    requiredIn: [],
    validate: z
      .string()
      .trim()
      .regex(/^#?[0-9a-fA-F]{6}$/, {
        message: "Use um código hex de 6 dígitos, ex.: #7A1FA2.",
      })
      .optional()
      .or(z.literal("")),
    inferable: false,
  },
  {
    id: "visual.tipografia",
    module: "visual",
    label: "Que estilo de letra combina mais com o seu negócio?",
    type: "select",
    options: [
      { value: "moderna", label: "Moderna e arredondada" },
      { value: "geometrica", label: "Geométrica e técnica" },
      { value: "neutra", label: "Neutra e discreta" },
    ],
    requiredIn: [],
    validate: z.enum(["moderna", "geometrica", "neutra"]).optional(),
    inferable: true,
  },
  {
    id: "visual.densidade",
    module: "visual",
    label: "Quanto espaço em branco você prefere?",
    type: "select",
    options: [
      { value: "compacta", label: "Compacta — mais conteúdo por tela" },
      { value: "regular", label: "Equilibrada" },
      { value: "espacosa", label: "Espaçosa — respiro e elegância" },
    ],
    requiredIn: [],
    validate: z.enum(["compacta", "regular", "espacosa"]).optional(),
    inferable: true,
  },

  // ── Módulo 6 · Conteúdo ────────────────────────────────────────────────────
  {
    id: "conteudo.autoridade",
    module: "conteudo",
    label: "Formação, experiência ou credenciais verificáveis (opcional)",
    help: "Ex.: registro profissional, anos de atuação, formações. Só o que é real e comprovável.",
    type: "textarea",
    requiredIn: [],
    validate: optionalText(800),
    inferable: false,
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
    quickFlow: true,
    validate: optionalText(1200),
    inferable: false,
  },
  {
    id: "conteudo.faq",
    module: "conteudo",
    label: "Perguntas frequentes dos seus clientes (opcional)",
    help: "Uma por linha, no formato: Pergunta? | Resposta",
    placeholder: "Aceita convênio? | Não, mas emitimos recibo para reembolso.",
    type: "textarea",
    requiredIn: [],
    validate: optionalText(2000),
    inferable: false,
  },
  {
    id: "conteudo.endereco",
    module: "conteudo",
    label: "Endereço de atendimento (opcional)",
    placeholder: "Ex.: Rua das Acácias, 120 — Cambuí, Campinas/SP",
    type: "text",
    requiredIn: [],
    validate: optionalText(300),
    inferable: false,
  },
  {
    id: "conteudo.horarios",
    module: "conteudo",
    label: "Horários de atendimento (opcional)",
    placeholder: "Ex.: Seg a sáb, 9h às 19h",
    type: "text",
    requiredIn: [],
    validate: optionalText(200),
    inferable: false,
  },

  // ── Módulo 7 · Conversão ───────────────────────────────────────────────────
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
    quickFlow: true,
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
    quickFlow: true,
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
    quickFlow: true,
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
    id: "conversao.form_campos",
    module: "conversao",
    label: "Quais campos o formulário deve pedir?",
    type: "multiselect",
    options: [
      { value: "nome", label: "Nome" },
      { value: "email", label: "E-mail" },
      { value: "telefone", label: "Telefone / WhatsApp" },
      { value: "mensagem", label: "Mensagem" },
    ],
    requiredIn: [],
    showIf: (a) => a["conversao.objetivo"]?.value === "lead_form",
    validate: z.array(z.enum(["nome", "email", "telefone", "mensagem"])).max(4).optional(),
    inferable: true,
  },
  {
    id: "conversao.cta_texto",
    module: "conversao",
    label: "Texto do botão principal (opcional)",
    help: "Se deixar em branco, sugerimos um de acordo com o objetivo.",
    placeholder: "Ex.: Quero agendar minha avaliação",
    type: "text",
    requiredIn: [],
    quickFlow: true,
    validate: z.string().trim().min(2).max(60).optional().or(z.literal("")),
    inferable: true,
  },

  // ── Módulo 8 · Anúncios ────────────────────────────────────────────────────
  {
    id: "anuncios.plataformas",
    module: "anuncios",
    label: "Você pretende anunciar? Em quais plataformas? (opcional)",
    help: "Usamos isso para gerar criativos coerentes com a página.",
    type: "multiselect",
    options: [
      { value: "meta", label: "Meta (Instagram/Facebook)" },
      { value: "google", label: "Google (pesquisa)" },
      { value: "tiktok", label: "TikTok" },
    ],
    requiredIn: [],
    validate: z.array(z.enum(["meta", "google", "tiktok"])).max(3).optional(),
    inferable: false,
  },
  {
    id: "anuncios.objetivo",
    module: "anuncios",
    label: "Qual é o objetivo principal dos anúncios?",
    type: "select",
    options: [
      { value: "alcance", label: "Ser conhecido na região" },
      { value: "trafego", label: "Levar visitantes à página" },
      { value: "leads", label: "Gerar contatos" },
      { value: "vendas", label: "Vender diretamente" },
    ],
    requiredIn: [],
    showIf: hasPlatforms,
    validate: z.enum(["alcance", "trafego", "leads", "vendas"]).optional(),
    inferable: true,
  },
  {
    id: "anuncios.orcamento",
    module: "anuncios",
    label: "Orçamento mensal aproximado para anúncios (opcional)",
    placeholder: "Ex.: R$ 300 por mês",
    type: "text",
    requiredIn: [],
    showIf: hasPlatforms,
    validate: optionalText(100),
    inferable: false,
  },
  {
    id: "anuncios.restricoes",
    module: "anuncios",
    label: "Alguma restrição de comunicação nos anúncios? (opcional)",
    help: "Ex.: não mencionar preço, evitar termos técnicos, regras do seu conselho profissional.",
    type: "textarea",
    requiredIn: [],
    showIf: hasPlatforms,
    validate: optionalText(400),
    inferable: false,
  },
];

export function visibleQuestions(
  mode: "rapido" | "completo",
  answers: BriefingAnswers,
): QuestionDef[] {
  return QUESTIONS.filter((q) => {
    if (mode === "rapido" && !q.quickFlow) return false;
    if (q.showIf && !q.showIf(answers)) return false;
    return true;
  });
}

/**
 * Valida um conjunto de respostas para conclusão do briefing.
 * Campo oculto por condição ou fora do modo não contamina o resultado.
 */
export function validateForCompletion(
  mode: "rapido" | "completo",
  answers: BriefingAnswers,
):
  | { ok: true; cleaned: BriefingAnswers }
  | { ok: false; missing: string[]; invalid: Array<{ id: string; message: string }> } {
  const visible = visibleQuestions(mode, answers);
  const cleaned: BriefingAnswers = {};
  const missing: string[] = [];
  const invalid: Array<{ id: string; message: string }> = [];

  for (const q of visible) {
    const record = answers[q.id];
    const required = q.requiredIn.includes(mode);
    const empty =
      record == null ||
      record.value == null ||
      record.value === "" ||
      (Array.isArray(record.value) && record.value.length === 0);
    if (empty) {
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
    if (parsed.data !== "" && parsed.data != null) {
      cleaned[q.id] = { value: parsed.data, origin: record.origin };
    }
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
