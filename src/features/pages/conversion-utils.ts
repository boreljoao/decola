import type { PageDocument } from "@/features/generation/page-document";

/** Resolve o destino real do CTA primário conforme o objetivo (spec §11.3). */
export function buildCtaHref(doc: PageDocument): {
  href: string;
  eventType: "whatsapp_click" | "cta_click";
  external: boolean;
} {
  const conv = doc.primaryConversion;
  switch (conv.type) {
    case "whatsapp": {
      const phone = conv.destination.replace(/[^\d]/g, "");
      // Sem DDI informado, assume Brasil (55) — telefone já validado no briefing.
      const full = phone.length <= 11 ? `55${phone}` : phone;
      const text = encodeURIComponent(
        `Olá! Vim pela página de ${doc.businessName} e quero saber mais.`,
      );
      return {
        href: `https://wa.me/${full}?text=${text}`,
        eventType: "whatsapp_click",
        external: true,
      };
    }
    case "lead_form":
      return { href: "#form", eventType: "cta_click", external: false };
    default:
      return { href: conv.destination, eventType: "cta_click", external: true };
  }
}

export const RADIUS_CLASS: Record<
  PageDocument["designTokens"]["radius"],
  string
> = {
  sm: "rounded-lg",
  md: "rounded-xl",
  lg: "rounded-2xl",
  xl: "rounded-3xl",
};

export const SECTION_PAD: Record<
  PageDocument["designTokens"]["density"],
  string
> = {
  compact: "py-12 sm:py-14",
  regular: "py-16 sm:py-20",
  spacious: "py-20 sm:py-28",
};
