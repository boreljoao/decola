import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { PageDocument } from "@/features/generation/page-document";
import type { CreativeProposals } from "./generator";

/**
 * Composição tipográfica real de criativos (spec §10/§8.4): satori (layout →
 * SVG) + resvg (SVG → PNG), com a paleta e as fontes da própria página.
 * Sem provedor de imagem por IA configurado, este é o caminho honesto — o
 * resultado é sinalizado como composição tipográfica.
 */

export interface RenderedCreative {
  kind: "meta_square" | "meta_vertical";
  width: number;
  height: number;
  png: Buffer;
  proposalIndex: number;
}

type SatoriNode = {
  type: string;
  props: Record<string, unknown> & { children?: SatoriNode[] | string };
};

function el(
  type: string,
  style: Record<string, unknown>,
  children?: SatoriNode[] | string,
): SatoriNode {
  return { type, props: { style, ...(children != null ? { children } : {}) } };
}

async function loadFonts() {
  const base = path.join(process.cwd(), "node_modules");
  const [interRegular, interBold, soraBold] = await Promise.all([
    readFile(path.join(base, "@fontsource/inter/files/inter-latin-400-normal.woff")),
    readFile(path.join(base, "@fontsource/inter/files/inter-latin-700-normal.woff")),
    readFile(path.join(base, "@fontsource/sora/files/sora-latin-700-normal.woff")),
  ]);
  return [
    { name: "Inter", data: interRegular, weight: 400 as const, style: "normal" as const },
    { name: "Inter", data: interBold, weight: 700 as const, style: "normal" as const },
    { name: "Sora", data: soraBold, weight: 700 as const, style: "normal" as const },
  ];
}

function creativeLayout(
  doc: PageDocument,
  proposal: NonNullable<CreativeProposals["meta"]>["proposals"][number],
  width: number,
  height: number,
): SatoriNode {
  const p = doc.designTokens.palette;
  const vertical = height > width;
  const pad = Math.round(width * 0.08);

  return el(
    "div",
    {
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      width: "100%",
      height: "100%",
      backgroundColor: p.bg,
      backgroundImage: `radial-gradient(circle at 80% 10%, ${p.primary}22, ${p.bg} 60%)`,
      color: p.text,
      padding: pad,
      fontFamily: "Inter",
    },
    [
      el(
        "div",
        {
          display: "flex",
          alignSelf: "flex-start",
          border: `2px solid ${p.muted}55`,
          borderRadius: 999,
          padding: `${Math.round(width * 0.012)}px ${Math.round(width * 0.03)}px`,
          fontSize: Math.round(width * 0.032),
          color: p.muted,
          fontWeight: 700,
        },
        doc.businessName,
      ),
      el(
        "div",
        { display: "flex", flexDirection: "column", gap: Math.round(width * 0.04) },
        [
          el(
            "div",
            {
              display: "flex",
              fontFamily: "Sora",
              fontWeight: 700,
              fontSize: Math.round(width * (vertical ? 0.085 : 0.075)),
              lineHeight: 1.12,
              letterSpacing: "-0.02em",
            },
            proposal.headline,
          ),
          el(
            "div",
            {
              display: "flex",
              fontSize: Math.round(width * 0.036),
              lineHeight: 1.4,
              color: p.muted,
              maxWidth: "92%",
            },
            proposal.primaryText,
          ),
        ],
      ),
      el(
        "div",
        {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
        },
        [
          el(
            "div",
            {
              display: "flex",
              backgroundColor: p.accent,
              color: p.accentContrast,
              borderRadius: Math.round(width * 0.02),
              padding: `${Math.round(width * 0.028)}px ${Math.round(width * 0.05)}px`,
              fontSize: Math.round(width * 0.04),
              fontWeight: 700,
            },
            proposal.ctaLabel,
          ),
          el(
            "div",
            {
              display: "flex",
              width: Math.round(width * 0.09),
              height: 6,
              backgroundColor: p.primary,
              borderRadius: 3,
            },
          ),
        ],
      ),
    ],
  );
}

export async function renderMetaCreatives(
  doc: PageDocument,
  proposals: CreativeProposals,
): Promise<RenderedCreative[]> {
  if (!proposals.meta) return [];
  const { default: satori } = await import("satori");
  const { Resvg } = await import("@resvg/resvg-js");
  const fonts = await loadFonts();

  const formats = [
    { kind: "meta_square" as const, width: 1080, height: 1080 },
    { kind: "meta_vertical" as const, width: 1080, height: 1920 },
  ];

  const out: RenderedCreative[] = [];
  for (const [index, proposal] of proposals.meta.proposals.entries()) {
    for (const format of formats) {
      const svg = await satori(
        creativeLayout(doc, proposal, format.width, format.height) as never,
        { width: format.width, height: format.height, fonts },
      );
      const png = new Resvg(svg, {
        fitTo: { mode: "width", value: format.width },
      })
        .render()
        .asPng();
      out.push({
        kind: format.kind,
        width: format.width,
        height: format.height,
        png: Buffer.from(png),
        proposalIndex: index,
      });
    }
  }
  return out;
}
