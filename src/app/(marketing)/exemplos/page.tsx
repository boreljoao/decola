import type { Metadata } from "next";
import { Reveal } from "@/components/marketing/reveal";
import { ExampleGallery } from "@/components/marketing/examples";

export const metadata: Metadata = {
  title: "Exemplos",
  description:
    "Explore páginas de demonstração da Decola: cada briefing dá origem a uma composição própria.",
};
export default function ExemplosPage() {
  return (
    <main className="site-container interior-page">
      <Reveal>
        <p className="eyebrow">DIFERENTES HISTÓRIAS. DIFERENTES COMEÇOS.</p>
        <h1 className="page-heading mt-5 max-w-3xl">
          Uma página com
          <br />
          <em>a cara do seu negócio.</em>
        </h1>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-ink-600">
          Explore o que nasce de um bom briefing. Os exemplos são negócios
          fictícios, compostos pelo mesmo motor que gera as páginas na Decola.
        </p>
      </Reveal>
      <div className="mt-12">
        <ExampleGallery />
      </div>
      <p className="gallery-note">
        Conteúdo de demonstração. A sua página começa com a sua história.
      </p>
    </main>
  );
}
