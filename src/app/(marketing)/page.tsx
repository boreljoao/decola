import Link from "next/link";
import { Reveal } from "@/components/marketing/reveal";
import { formatBRL, PLANS } from "@/config/commercial-policy";

/**
 * Home (spec §5.2). Regra de honestidade: anunciar somente capacidades ativas;
 * criativos e Voo Contínuo aparecem como "em construção", sem promessa de
 * resultado garantido, sem depoimentos ou números inventados.
 */

export default function HomePage() {
  return (
    <main>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(55% 45% at 75% 10%, rgb(53 115 245 / 0.16), transparent), radial-gradient(40% 35% at 15% 90%, rgb(237 164 40 / 0.07), transparent)",
          }}
        />
        <div className="relative mx-auto grid w-full max-w-[1240px] items-center gap-14 px-5 py-20 sm:px-8 lg:grid-cols-[6fr_5fr] lg:py-28">
          <Reveal>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-1.5 text-sm font-medium text-mist-300">
              <span className="h-1.5 w-1.5 rounded-full bg-electric-400" />
              Feita para pequenos negócios brasileiros
            </p>
            <h1
              style={{ fontFamily: "var(--font-sora)" }}
              className="mt-6 text-balance text-4xl font-bold leading-[1.08] sm:text-5xl lg:text-6xl"
            >
              Seu negócio pronto para receber clientes.{" "}
              <span className="text-electric-300">
                Da primeira pergunta à página no ar.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-mist-300">
              Transforme o que você sabe sobre o seu negócio em uma página com a
              sua identidade. Depois, acompanhe o que funciona e continue
              melhorando.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link
                href="/cadastro"
                className="rounded-xl bg-ember-500 px-7 py-3.5 text-base font-semibold text-night-950 shadow-[0_8px_30px_-8px_rgb(237_164_40/0.5)] transition-all hover:-translate-y-0.5 hover:bg-ember-400"
              >
                Decolar grátis
              </Link>
              <Link
                href="/exemplos"
                className="rounded-xl border border-white/15 px-7 py-3.5 text-base font-semibold text-mist-100 transition-colors hover:bg-white/5"
              >
                Ver uma página nascendo
              </Link>
            </div>
            <p className="mt-4 text-sm text-mist-500">
              Grátis para publicar sua primeira página. Sem cartão de crédito.
            </p>
          </Reveal>

          {/* demonstração: composição de página com a linguagem real do produto */}
          <Reveal delay={0.15}>
            <div
              aria-hidden="true"
              className="relative mx-auto w-full max-w-md rounded-2xl border border-white/10 bg-night-850 p-5 shadow-2xl"
            >
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <span className="ml-2 h-5 flex-1 rounded-md bg-white/5 px-2 text-[10px] leading-5 text-mist-700">
                  studio-ana.decola…
                </span>
              </div>
              <div className="mt-4 rounded-xl bg-[#FDF9F7] p-5 text-[#2B1F24]">
                <span className="inline-block rounded-full border border-[#2B1F24]/10 px-2.5 py-0.5 text-[9px] font-medium text-[#7A6A70]">
                  Studio Ana Lima
                </span>
                <p
                  style={{ fontFamily: "var(--font-sora)" }}
                  className="mt-2.5 text-lg font-bold leading-snug"
                >
                  Sua pele cuidada por quem entende de você
                </p>
                <p className="mt-1.5 text-[11px] leading-relaxed text-[#7A6A70]">
                  Avaliação personalizada e tratamentos faciais com protocolo
                  próprio.
                </p>
                <span className="mt-3 inline-block rounded-lg bg-[#C98A2D] px-4 py-2 text-[11px] font-semibold text-white">
                  Chamar no WhatsApp
                </span>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {["Atendimento individual", "Ambiente preparado", "Protocolo próprio"].map(
                    (t) => (
                      <div
                        key={t}
                        className="rounded-lg border border-[#2B1F24]/8 bg-white p-2 text-[8px] font-medium leading-tight text-[#2B1F24]"
                      >
                        {t}
                      </div>
                    ),
                  )}
                </div>
              </div>
              <p className="mt-3 text-center text-[10px] text-mist-700">
                Exemplo ilustrativo composto com os componentes reais da Decola
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Dor ──────────────────────────────────────────────────────────── */}
      <section className="border-t border-white/5 bg-night-850/60">
        <div className="mx-auto w-full max-w-[1240px] px-5 py-20 sm:px-8">
          <Reveal>
            <h2
              style={{ fontFamily: "var(--font-sora)" }}
              className="max-w-2xl text-balance text-3xl font-bold sm:text-4xl"
            >
              Você sabe explicar seu negócio. Transformar isso em página é que
              custa caro.
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              {
                title: "Contratar é caro e demorado",
                text: "Orçamentos, prazos, idas e vindas — e a página fica pronta quando o momento já passou.",
              },
              {
                title: "Ferramentas genéricas cansam",
                text: "Editores de arrastar e soltar pedem que você vire designer. Não era esse o combinado.",
              },
              {
                title: "Publicar é só o começo",
                text: "Sem medir visitas e contatos, você nunca sabe o que está funcionando de verdade.",
              },
            ].map((item, i) => (
              <Reveal key={item.title} delay={i * 0.08}>
                <div className="h-full rounded-2xl border border-white/8 bg-night-800 p-7">
                  <h3 className="text-lg font-semibold">{item.title}</h3>
                  <p className="mt-3 leading-relaxed text-mist-500">{item.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Como funciona ────────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-[1240px] px-5 py-20 sm:px-8">
        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-widest text-electric-400">
            Como funciona
          </p>
          <h2
            style={{ fontFamily: "var(--font-sora)" }}
            className="mt-3 max-w-2xl text-balance text-3xl font-bold sm:text-4xl"
          >
            Três passos entre a sua cabeça e a sua página no ar
          </h2>
        </Reveal>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {[
            {
              step: "1",
              title: "Responda bem perguntado",
              text: "Um briefing que pergunta o que importa: sua oferta, seu público, sua dor, seu diferencial. Cerca de 5 minutos no modo rápido.",
            },
            {
              step: "2",
              title: "Veja a página nascer",
              text: "A Decola compõe seções, cores e textos a partir das suas respostas — cada negócio recebe uma composição própria. Ajuste o que quiser.",
            },
            {
              step: "3",
              title: "Decole e acompanhe",
              text: "Publique em um clique no seu endereço Decola. Visitas, cliques e contatos ficam registrados no seu painel — dados reais, sempre.",
            },
          ].map((item, i) => (
            <Reveal key={item.step} delay={i * 0.08}>
              <div className="relative h-full rounded-2xl border border-white/8 bg-night-850 p-7">
                <span
                  style={{ fontFamily: "var(--font-sora)" }}
                  className="text-4xl font-bold text-electric-500/40"
                >
                  {item.step}
                </span>
                <h3 className="mt-3 text-lg font-semibold">{item.title}</h3>
                <p className="mt-3 leading-relaxed text-mist-500">{item.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Briefing como diferencial ────────────────────────────────────── */}
      <section className="border-t border-white/5 bg-night-850/60">
        <div className="mx-auto grid w-full max-w-[1240px] items-center gap-12 px-5 py-20 sm:px-8 lg:grid-cols-2">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-widest text-electric-400">
              O diferencial
            </p>
            <h2
              style={{ fontFamily: "var(--font-sora)" }}
              className="mt-3 text-balance text-3xl font-bold sm:text-4xl"
            >
              Ser bem perguntado muda tudo
            </h2>
            <p className="mt-5 max-w-lg leading-relaxed text-mist-300">
              Cada resposta vira uma decisão concreta na sua página: o tom dos
              textos, a paleta de cores, a ordem das seções, o botão certo para
              o seu objetivo. Nada de modelo genérico preenchido às pressas.
            </p>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-mist-500">
              E o que você não informar, a Decola não inventa: sem depoimento
              fabricado, sem garantia falsa, sem preço que você nunca aprovou.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="grid gap-3">
              {[
                {
                  q: "Qual é o principal problema que o seu cliente quer resolver?",
                  effect: "→ define a seção de dor e o ângulo do título",
                },
                {
                  q: "O que torna o seu negócio diferente dos concorrentes?",
                  effect: "→ vira o destaque do herói e dos benefícios",
                },
                {
                  q: "Que sensações a página deve transmitir?",
                  effect: "→ orienta cores, tipografia e movimento",
                },
              ].map((item) => (
                <div
                  key={item.q}
                  className="rounded-2xl border border-white/8 bg-night-800 p-5"
                >
                  <p className="font-medium">{item.q}</p>
                  <p className="mt-2 text-sm text-electric-300">{item.effect}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Voo Contínuo (honesto: em construção) ────────────────────────── */}
      <section className="mx-auto w-full max-w-[1240px] px-5 py-20 sm:px-8">
        <Reveal>
          <div className="rounded-2xl border border-white/8 bg-night-850 p-8 sm:p-12">
            <div className="flex flex-wrap items-center gap-3">
              <h2
                style={{ fontFamily: "var(--font-sora)" }}
                className="text-2xl font-bold sm:text-3xl"
              >
                Depois da decolagem, o Voo Contínuo
              </h2>
              <span className="rounded-full border border-ember-500/40 px-3 py-1 text-xs font-semibold text-ember-400">
                Em construção
              </span>
            </div>
            <p className="mt-4 max-w-2xl leading-relaxed text-mist-300">
              Observar o comportamento real dos visitantes, formular uma
              hipótese, testar uma variação e manter só o que comprovadamente
              funciona. Sem dados suficientes, a Decola diz “aguardando dados” —
              nunca inventa melhora.
            </p>
            <p className="mt-3 text-sm text-mist-500">
              O painel de métricas com visitas, cliques e leads já está no ar
              para todas as contas. Os testes automáticos chegam em seguida.
            </p>
          </div>
        </Reveal>
      </section>

      {/* ── Preços resumidos ─────────────────────────────────────────────── */}
      <section className="border-t border-white/5 bg-night-850/60">
        <div className="mx-auto w-full max-w-[1240px] px-5 py-20 sm:px-8">
          <Reveal>
            <h2
              style={{ fontFamily: "var(--font-sora)" }}
              className="text-balance text-3xl font-bold sm:text-4xl"
            >
              Comece grátis. Cresça quando fizer sentido.
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[PLANS.free, PLANS.start, PLANS.pro].map((plan, i) => (
              <Reveal key={plan.id} delay={i * 0.08}>
                <div
                  className={`relative h-full rounded-2xl border p-7 ${
                    plan.highlight
                      ? "border-ember-500/50 bg-night-800"
                      : "border-white/8 bg-night-850"
                  }`}
                >
                  {plan.highlight && (
                    <span className="absolute -top-3 left-6 rounded-full bg-ember-500 px-3 py-1 text-xs font-bold text-night-950">
                      {plan.highlight}
                    </span>
                  )}
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  <p
                    style={{ fontFamily: "var(--font-sora)" }}
                    className="tabular mt-3 text-3xl font-bold"
                  >
                    {plan.monthlyPriceCents.value === 0
                      ? "R$ 0"
                      : formatBRL(plan.monthlyPriceCents.value ?? 0)}
                    {plan.monthlyPriceCents.value !== 0 && (
                      <span className="text-base font-normal text-mist-500">
                        /mês
                      </span>
                    )}
                  </p>
                  <ul className="mt-5 grid gap-2.5 text-sm text-mist-300">
                    <li>
                      {plan.entitlements.maxPublishedPages === "unlimited_commercial"
                        ? "Páginas sem limite comercial"
                        : `${plan.entitlements.maxPublishedPages} página${Number(plan.entitlements.maxPublishedPages) > 1 ? "s" : ""} publicada${Number(plan.entitlements.maxPublishedPages) > 1 ? "s" : ""}`}
                    </li>
                    <li>
                      {plan.entitlements.customDomain
                        ? "Domínio próprio"
                        : "Endereço Decola (subdomínio)"}
                    </li>
                    <li>
                      {plan.entitlements.showDecolaBadge
                        ? "Com marca Decola no rodapé"
                        : "Sem marca Decola"}
                    </li>
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal>
            <p className="mt-8 text-center text-sm text-mist-500">
              <Link href="/precos" className="font-semibold text-electric-300 hover:underline">
                Ver todos os planos e condições →
              </Link>
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── CTA final ────────────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-[1240px] px-5 py-24 text-center sm:px-8">
        <Reveal>
          <h2
            style={{ fontFamily: "var(--font-sora)" }}
            className="mx-auto max-w-2xl text-balance text-3xl font-bold sm:text-4xl"
          >
            A sua página começa com uma boa pergunta
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-mist-300">
            Crie sua conta grátis, responda o briefing e veja sua página pronta
            para decolar.
          </p>
          <Link
            href="/cadastro"
            className="mt-8 inline-block rounded-xl bg-ember-500 px-8 py-4 text-lg font-semibold text-night-950 shadow-[0_8px_30px_-8px_rgb(237_164_40/0.5)] transition-all hover:-translate-y-0.5 hover:bg-ember-400"
          >
            Decolar grátis ✦
          </Link>
        </Reveal>
      </section>
    </main>
  );
}
