import { z } from "zod";
import type { BriefingAnswers } from "@/features/briefing/questions";
import { answerValue } from "@/features/briefing/questions";
import type { PageDocument } from "@/features/generation/page-document";

/**
 * Gerador de propostas de criativos (spec §10), derivadas do PageDocument e do
 * módulo Anúncios do briefing. Honestidade de formato:
 * - Meta: copy + imagens quadrada/vertical (composição tipográfica real).
 * - Google: anúncio de TEXTO com limites de campo validados — imagem não vira
 *   campanha de pesquisa.
 * - TikTok: ROTEIRO identificado como roteiro — nunca um vídeo prometido.
 * Limites Meta/Google usados são os recomendados amplamente publicados;
 * revalidar contra a documentação vigente antes de campanhas reais.
 */

const bounded = (max: number) => z.string().min(1).max(max);

export const metaProposalSchema = z.object({
  concept: bounded(120),
  headline: bounded(40),
  primaryText: bounded(125),
  description: bounded(30).optional(),
  ctaLabel: bounded(30),
});

export const creativeProposalsSchema = z.object({
  generatedFor: z.object({
    pageVersionId: z.string().uuid(),
    businessName: bounded(120),
  }),
  meta: z
    .object({
      proposals: z.array(metaProposalSchema).min(1).max(3),
      note: z.string(),
    })
    .optional(),
  google: z
    .object({
      headlines: z.array(bounded(30)).min(3).max(5),
      descriptions: z.array(bounded(90)).min(2).max(3),
      finalUrl: z.string().url().optional(),
      finalUrlNote: z.string().optional(),
      note: z.string(),
    })
    .optional(),
  tiktok: z
    .object({
      roteiro: z.object({
        gancho: bounded(200),
        cenas: z.array(bounded(300)).min(2).max(6),
        cta: bounded(120),
      }),
      note: z.string(),
    })
    .optional(),
});

export type CreativeProposals = z.infer<typeof creativeProposalsSchema>;

function truncateAtWord(text: string, max: number): string {
  const t = text.trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > max * 0.5 ? cut.slice(0, lastSpace) : cut).replace(
    /[,;:.\s]+$/,
    "",
  );
}

function firstSentence(text: string): string {
  return text.split(/[.;!?]/)[0]?.trim() ?? text.trim();
}

function uniqueBounded(candidates: string[], max: number, count: number, fallbacks: string[]): string[] {
  const out: string[] = [];
  for (const c of [...candidates, ...fallbacks]) {
    const t = truncateAtWord(c, max);
    if (t.length >= 3 && !out.includes(t)) out.push(t);
    if (out.length >= count) break;
  }
  return out;
}

export function generateCreativeProposals(input: {
  document: PageDocument;
  pageVersionId: string;
  answers: BriefingAnswers;
  publishedUrl?: string;
}): CreativeProposals {
  const { document: doc, answers } = input;
  const nome = doc.businessName;
  const hero = doc.sections.find((s) => s.type === "hero");
  const headline = hero?.type === "hero" ? hero.props.headline : nome;
  const sub = hero?.type === "hero" ? hero.props.subheadline : "";
  const offer = doc.sections.find((s) => s.type === "offer");
  const oferta = offer?.type === "offer" ? offer.props.title : headline;
  const dor =
    (answerValue<string>(answers, "publico.dor") ?? "").trim() || sub;
  const diferencial = answerValue<string>(answers, "oferta.diferencial") ?? "";
  const restricoes = answerValue<string>(answers, "anuncios.restricoes");
  const plataformas = answerValue<string[]>(answers, "anuncios.plataformas") ?? [
    "meta",
    "google",
  ];
  const cta = doc.primaryConversion.label;

  const restrictionNote = restricoes
    ? ` Restrições informadas no briefing respeitadas manualmente na revisão: “${restricoes}”.`
    : "";

  const result: CreativeProposals = {
    generatedFor: { pageVersionId: input.pageVersionId, businessName: nome },
  };

  if (plataformas.includes("meta")) {
    result.meta = {
      proposals: [
        {
          concept: "Direto na oferta: o que é, para quem e o próximo passo.",
          headline: truncateAtWord(oferta, 40),
          primaryText: truncateAtWord(
            `${firstSentence(dor)}? ${truncateAtWord(oferta, 60)} com ${nome}.`,
            125,
          ),
          description: diferencial
            ? truncateAtWord(diferencial, 30)
            : undefined,
          ctaLabel: truncateAtWord(cta, 30),
        },
        {
          concept: "Dor primeiro: espelhar o problema e apresentar a saída.",
          headline: truncateAtWord(`Chega de ${firstSentence(dor).toLowerCase()}`, 40),
          primaryText: truncateAtWord(
            `${nome}: ${firstSentence(sub || oferta).toLowerCase()}. Fale agora e dê o próximo passo.`,
            125,
          ),
          ctaLabel: truncateAtWord(cta, 30),
        },
      ],
      note:
        "Formatos de imagem: quadrado 1080×1080 e vertical 1080×1920, com área segura. Copy dentro dos limites recomendados da Meta." +
        restrictionNote,
    };
  }

  if (plataformas.includes("google")) {
    result.google = {
      headlines: uniqueBounded(
        [oferta, nome, cta, diferencial],
        30,
        4,
        ["Fale com a gente hoje", "Atendimento direto"],
      ),
      descriptions: uniqueBounded(
        [
          `${firstSentence(sub || dor)}. ${truncateAtWord(oferta, 40)}.`,
          diferencial
            ? `${truncateAtWord(diferencial, 70)}. Fale com ${truncateAtWord(nome, 15)}.`
            : `Conheça ${nome} e dê o próximo passo hoje.`,
        ],
        90,
        2,
        [`Conheça ${nome} e fale com a gente hoje mesmo.`],
      ),
      finalUrl: input.publishedUrl,
      finalUrlNote: input.publishedUrl
        ? undefined
        : "Publique a página para obter a URL final do anúncio.",
      note:
        "Anúncio de texto responsivo: títulos de até 30 caracteres e descrições de até 90 — validados. Não usar imagem como campanha de pesquisa." +
        restrictionNote,
    };
  }

  if (plataformas.includes("tiktok")) {
    result.tiktok = {
      roteiro: {
        gancho: truncateAtWord(
          `Se você sofre com ${firstSentence(dor).toLowerCase()}, esse vídeo é pra você.`,
          200,
        ),
        cenas: [
          `Mostre o problema no cotidiano: ${truncateAtWord(firstSentence(dor), 120)}.`,
          `Apresente ${nome} e o que muda: ${truncateAtWord(oferta, 100)}.`,
          diferencial
            ? `Prove com o seu diferencial real: ${truncateAtWord(diferencial, 120)}.`
            : `Mostre o atendimento acontecendo de verdade.`,
        ],
        cta: truncateAtWord(`Feche com “${cta}” e o endereço da página.`, 120),
      },
      note:
        "Isto é um ROTEIRO para você gravar — a Decola não gera o vídeo pronto nesta versão.",
    };
  }

  return creativeProposalsSchema.parse(result);
}
