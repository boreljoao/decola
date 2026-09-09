import type { PageDocument } from "./page-document";

/**
 * Paletas por nicho (módulo puro, importável no cliente pelo editor).
 * Combinações suportadas de tokens — o editor manual escolhe entre elas
 * (spec §9: "dentro de combinações suportadas").
 */

export type Palette = PageDocument["designTokens"]["palette"];
export type NicheKey = PageDocument["strategy"]["niche"];

export interface NichePalettePair {
  label: string;
  light: Palette;
  dark: Palette;
}

export const NICHE_PALETTES: Record<NicheKey, NichePalettePair> = {
  estetica_beleza: {
    label: "Estética e beleza",
    light: {
      bg: "#FDF9F7", surface: "#FFFFFF", text: "#2B1F24", muted: "#7A6A70",
      primary: "#A6486B", primaryContrast: "#FFFFFF", accent: "#C98A2D", accentContrast: "#211302",
    },
    dark: {
      bg: "#211A1E", surface: "#2C2328", text: "#F5EDF0", muted: "#B9A8AF",
      primary: "#E38BAC", primaryContrast: "#33101E", accent: "#E2B25E", accentContrast: "#2A1B03",
    },
  },
  saude: {
    label: "Saúde e bem-estar",
    light: {
      bg: "#F6FAF9", surface: "#FFFFFF", text: "#15292B", muted: "#5E7476",
      primary: "#0E7E74", primaryContrast: "#FFFFFF", accent: "#B4762A", accentContrast: "#FFFFFF",
    },
    dark: {
      bg: "#122022", surface: "#1B2C2E", text: "#EAF4F3", muted: "#9FB6B4",
      primary: "#4FC0B4", primaryContrast: "#06211E", accent: "#E0A45C", accentContrast: "#271703",
    },
  },
  servicos_locais: {
    label: "Serviços locais",
    light: {
      bg: "#F7F9FC", surface: "#FFFFFF", text: "#1A2433", muted: "#5D6B80",
      primary: "#1F5EDD", primaryContrast: "#FFFFFF", accent: "#C77914", accentContrast: "#FFFFFF",
    },
    dark: {
      bg: "#131A26", surface: "#1C2534", text: "#EBF0F8", muted: "#9AA8BC",
      primary: "#6D9BFF", primaryContrast: "#0A1B3D", accent: "#EFA94A", accentContrast: "#2A1A02",
    },
  },
  gastronomia: {
    label: "Gastronomia",
    light: {
      bg: "#FBF7F2", surface: "#FFFFFF", text: "#2A1E14", muted: "#77685A",
      primary: "#B4451F", primaryContrast: "#FFFFFF", accent: "#946A15", accentContrast: "#FFFFFF",
    },
    dark: {
      bg: "#1D1510", surface: "#291E17", text: "#F7EFE7", muted: "#BCA893",
      primary: "#F2814D", primaryContrast: "#33150A", accent: "#E6B454", accentContrast: "#2A1C03",
    },
  },
  infoprodutos: {
    label: "Infoprodutos",
    light: {
      bg: "#F8F7FC", surface: "#FFFFFF", text: "#221E33", muted: "#6A6482",
      primary: "#5B3DF5", primaryContrast: "#FFFFFF", accent: "#B26A0F", accentContrast: "#FFFFFF",
    },
    dark: {
      bg: "#16131F", surface: "#201B2E", text: "#F0EDF9", muted: "#A79FC0",
      primary: "#9D86FF", primaryContrast: "#1B1040", accent: "#F0AC4B", accentContrast: "#2A1A02",
    },
  },
  outro: {
    label: "Neutra",
    light: {
      bg: "#F8F9FB", surface: "#FFFFFF", text: "#1D2530", muted: "#5F6B7A",
      primary: "#2563EB", primaryContrast: "#FFFFFF", accent: "#B4762A", accentContrast: "#FFFFFF",
    },
    dark: {
      bg: "#141A22", surface: "#1D2530", text: "#EDF1F7", muted: "#9BA7B6",
      primary: "#7AA5FF", primaryContrast: "#0A1F4D", accent: "#E8AC55", accentContrast: "#2A1A02",
    },
  },
};

/** Contraste simples por luminância relativa (para cor de marca do usuário). */
export function contrastFor(hex: string): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.55 ? "#1A1A1A" : "#FFFFFF";
}
