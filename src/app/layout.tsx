import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Bundled licensed fonts keep builds independent of Google Fonts.
const inter = localFont({
  variable: "--font-inter",
  display: "swap",
  src: [
    {
      path: "../../node_modules/@fontsource/inter/files/inter-latin-400-normal.woff2",
      weight: "400",
    },
    {
      path: "../../node_modules/@fontsource/inter/files/inter-latin-500-normal.woff2",
      weight: "500",
    },
    {
      path: "../../node_modules/@fontsource/inter/files/inter-latin-600-normal.woff2",
      weight: "600",
    },
  ],
});
const sora = localFont({
  variable: "--font-sora",
  display: "swap",
  preload: false,
  src: [
    {
      path: "../../node_modules/@fontsource/sora/files/sora-latin-400-normal.woff2",
      weight: "400",
    },
    {
      path: "../../node_modules/@fontsource/sora/files/sora-latin-600-normal.woff2",
      weight: "600",
    },
    {
      path: "../../node_modules/@fontsource/sora/files/sora-latin-700-normal.woff2",
      weight: "700",
    },
  ],
});
const spaceGrotesk = localFont({
  variable: "--font-space-grotesk",
  display: "swap",
  preload: false,
  src: [
    {
      path: "../../node_modules/@fontsource/space-grotesk/files/space-grotesk-latin-400-normal.woff2",
      weight: "400",
    },
    {
      path: "../../node_modules/@fontsource/space-grotesk/files/space-grotesk-latin-500-normal.woff2",
      weight: "500",
    },
    {
      path: "../../node_modules/@fontsource/space-grotesk/files/space-grotesk-latin-700-normal.woff2",
      weight: "700",
    },
  ],
});
const editorial = localFont({
  variable: "--font-editorial",
  display: "swap",
  src: [
    {
      path: "../../node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff2",
      weight: "400",
      style: "italic",
    },
  ],
});

export const metadata: Metadata = {
  title: {
    default: "Decola — Seu negócio pronto para receber clientes",
    template: "%s · Decola",
  },
  description:
    "Transforme o que você sabe sobre o seu negócio em uma página com a sua identidade. Publique, receba contatos e acompanhe o que funciona com a Decola.",
};
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={
        sora.variable +
        " " +
        spaceGrotesk.variable +
        " " +
        inter.variable +
        " " +
        editorial.variable +
        " h-full antialiased"
      }
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
