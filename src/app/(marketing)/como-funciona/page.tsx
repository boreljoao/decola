import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/marketing/reveal";

export const metadata: Metadata = {
  title: "Como funciona",
  description:
    "Do briefing à página no ar: como a Decola transforma respostas em uma landing page com a identidade do seu negócio.",
};

const STEPS = [
  {
    title: "1 · Você responde o briefing",
    text: "Perguntas diretas sobre oferta, público, dor e diferencial — com exemplos do seu nicho. No modo rápido, cerca de 5 minutos. Suas respostas são salvas automaticamente: pode sair e voltar quando quiser.",
    detail:
      "O que você não informar, a Decola não inventa: sem depoimentos fabricados, sem garantias falsas, sem preços que você não aprovou.",
  },
  {
    title: "2 · O motor compõe a sua página",
    text: "Estratégia, seleção de seções, textos, cores e tipografia derivam das suas respostas. Cada etapa da geração é registrada e você acompanha o progresso real — nada de barra de carregamento de mentira.",
    detail:
      "A composição usa a biblioteca proprietária de componentes da Decola, com variações estruturais por nicho e emoção.",
  },
  {
    title: "3 · Você revisa e decola",
    text: "Veja o preview em desktop e mobile, ajuste o briefing se quiser regenerar e publique no seu endereço Decola em um clique. No Free, sua página vai ao ar com a marca Decola no rodapé.",
    detail:
      "Publicar cria uma versão imutável: se algo falhar, a versão anterior continua no ar.",
  },
  {
    title: "4 · A Decola mede o que importa",
    text: "Visitas, cliques no botão, cliques no WhatsApp e leads confirmados aparecem no seu painel — métricas distintas, sem maquiagem. Cada contato do formulário fica salvo e você é avisado por e-mail.",
    detail:
      "Medição first-party: sem cookies e sem identificadores persistentes por padrão.",
  },
];

export default function ComoFuncionaPage() {
  return (
    <main className="mx-auto w-full max-w-[1240px] px-5 py-16 sm:px-8">
      <Reveal>
        <h1
          style={{ fontFamily: "var(--font-sora)" }}
          className="max-w-2xl text-balance text-4xl font-bold sm:text-5xl"
        >
          Da primeira pergunta à página no ar
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-mist-300">
          A Decola não pede que você aprenda design. Pede boas respostas — e
          devolve uma página com a sua identidade, pronta para receber clientes.
        </p>
      </Reveal>

      <div className="mt-14 grid gap-6">
        {STEPS.map((step, i) => (
          <Reveal key={step.title} delay={i * 0.05}>
            <div className="grid gap-4 rounded-2xl border border-white/8 bg-night-850 p-8 md:grid-cols-[2fr_3fr] md:gap-10">
              <h2
                style={{ fontFamily: "var(--font-sora)" }}
                className="text-2xl font-bold"
              >
                {step.title}
              </h2>
              <div>
                <p className="leading-relaxed text-mist-300">{step.text}</p>
                <p className="mt-3 text-sm leading-relaxed text-mist-500">
                  {step.detail}
                </p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal>
        <div className="mt-16 text-center">
          <Link
            href="/cadastro"
            className="inline-block rounded-xl bg-ember-500 px-8 py-4 text-lg font-semibold text-night-950 transition-all hover:-translate-y-0.5 hover:bg-ember-400"
          >
            Começar meu briefing ✦
          </Link>
          <p className="mt-3 text-sm text-mist-500">
            Grátis, sem cartão. Suas respostas ficam salvas.
          </p>
        </div>
      </Reveal>
    </main>
  );
}
