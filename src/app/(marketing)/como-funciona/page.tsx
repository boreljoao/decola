import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/marketing/reveal";
import { SpotlightCard } from "@/components/marketing/spotlight-card";

export const metadata: Metadata = {
  title: "Como funciona",
  description:
    "Do briefing à página no ar: como a Decola transforma respostas em uma landing page com a identidade do seu negócio.",
};

const STEPS = [
  {
    number: "1",
    title: "Você responde o briefing",
    text: "Perguntas diretas sobre oferta, público, dor e diferencial — com exemplos do seu nicho. No modo rápido, cerca de 5 minutos. Suas respostas são salvas automaticamente: pode sair e voltar quando quiser.",
    detail:
      "O que você não informar, a Decola não inventa: sem depoimento fabricado, sem garantia falsa, sem preço que você nunca aprovou.",
    aside: [
      "Responder falando, se preferir digitar menos",
      "Salvamento automático a cada resposta",
      "Modo completo com 8 módulos, quando quiser aprofundar",
    ],
  },
  {
    number: "2",
    title: "O motor compõe a sua página",
    text: "Estratégia, seleção de seções, textos, cores e tipografia derivam das suas respostas. Cada etapa da geração é registrada e você acompanha o progresso real — nada de barra de carregamento de mentira.",
    detail:
      "A composição usa a biblioteca proprietária de componentes da Decola, com variações estruturais por nicho e emoção.",
    aside: [
      "Paleta e tipografia escolhidas pelo seu segmento",
      "Seções que só aparecem se você tem o conteúdo",
      "A geração continua mesmo se você fechar a aba",
    ],
  },
  {
    number: "3",
    title: "Você revisa e decola",
    text: "Veja o preview em desktop e mobile, ajuste no editor e publique no seu endereço Decola em um clique. No Free, sua página vai ao ar com a marca Decola no rodapé.",
    detail:
      "Publicar cria uma versão imutável: se algo falhar, a versão anterior continua no ar.",
    aside: [
      "Editor de texto, cores, imagens e ordem das seções",
      "Histórico de versões com restauração",
      "Republicar e despublicar quando quiser",
    ],
  },
  {
    number: "4",
    title: "A Decola mede o que importa",
    text: "Visitas, cliques no botão, cliques no WhatsApp e leads confirmados aparecem no seu painel — métricas distintas, sem maquiagem. Cada contato do formulário fica salvo e você é avisado por e-mail.",
    detail:
      "Medição first-party: sem cookies e sem identificadores persistentes por padrão.",
    aside: [
      "Clique no WhatsApp ≠ conversa confirmada",
      "Taxa de conversão sempre com o denominador à vista",
      "Diário de Bordo mensal com o próximo passo sugerido",
    ],
  },
];

export default function ComoFuncionaPage() {
  return (
    <main className="interior-page relative">
      <section className="relative overflow-hidden">
        <div className="relative mx-auto w-full max-w-[1240px] px-5 py-20 sm:px-8">
          <Reveal>
            <h1
              style={{ fontFamily: "var(--font-editorial)" }}
              className="page-heading max-w-2xl text-balance text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl"
            >
              Da primeira pergunta à página no ar
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-600">
              A Decola não pede que você aprenda design. Pede boas respostas — e
              devolve uma página com a sua identidade, pronta para receber
              clientes.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1240px] px-5 pb-24 sm:px-8">
        <div className="grid gap-6">
          {STEPS.map((step, i) => (
            <Reveal key={step.number} delay={i * 0.05}>
              <SpotlightCard className="p-8 sm:p-10">
                <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr_1fr]">
                  <div className="flex items-start gap-4">
                    <span
                      style={{ fontFamily: "var(--font-sora)" }}
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-electric-500/25 bg-electric-500/10 text-lg font-bold text-electric-700"
                    >
                      {step.number}
                    </span>
                    <h2
                      style={{ fontFamily: "var(--font-sora)" }}
                      className="text-2xl font-bold leading-tight tracking-tight"
                    >
                      {step.title}
                    </h2>
                  </div>

                  <div>
                    <p className="leading-relaxed text-ink-600">{step.text}</p>
                    <p className="mt-3 text-sm leading-relaxed text-ink-600">
                      {step.detail}
                    </p>
                  </div>

                  <ul className="grid content-start gap-2">
                    {step.aside.map((item) => (
                      <li
                        key={item}
                        className="rounded-lg border border-ink-900/10 bg-paper/60 px-3.5 py-2.5 text-sm text-ink-600"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </SpotlightCard>
            </Reveal>
          ))}
        </div>

        <Reveal>
          <div className="mt-16 text-center">
            <Link
              href="/cadastro"
              className="inline-block rounded-xl bg-ink-900 px-8 py-4 text-lg font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-ink-600"
            >
              Começar meu briefing ✦
            </Link>
            <p className="mt-3 text-sm text-ink-600">
              Grátis, sem cartão. Suas respostas ficam salvas.
            </p>
          </div>
        </Reveal>
      </section>
    </main>
  );
}
