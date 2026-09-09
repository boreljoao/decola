import Link from "next/link";
import { Aurora, DotGrid } from "@/components/marketing/aurora";
import { Marquee } from "@/components/marketing/marquee";
import { Reveal } from "@/components/marketing/reveal";
import { SpotlightCard } from "@/components/marketing/spotlight-card";
import { formatBRL, PLANS } from "@/config/commercial-policy";
import { DEMO_FIXTURES } from "@/features/demo/fixtures";
import { hashAnswers } from "@/features/generation/pipeline";
import { generatePageDocument } from "@/features/generation/rules-engine";

/**
 * Home (spec §5.2). Regra de honestidade mantida no redesign: só anuncia
 * capacidade ativa; nada de depoimento, número de mercado ou selo inventado.
 * O que ainda está em construção aparece com essa etiqueta.
 */

const NICHE_LABELS: Record<string, string> = {
  estetica_beleza: "Estética",
  saude: "Saúde",
  servicos_locais: "Serviços locais",
  gastronomia: "Gastronomia",
  infoprodutos: "Infoprodutos",
};

export default function HomePage() {
  // As miniaturas usam o MOTOR REAL sobre briefings fictícios identificados —
  // não são mockups desenhados à mão.
  const examples = DEMO_FIXTURES.map((fixture) => ({
    fixture,
    doc: generatePageDocument({
      briefingRevisionId: fixture.revisionId,
      answersHash: hashAnswers(fixture.answers),
      answers: fixture.answers,
    }),
  }));

  return (
    <main>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <Aurora />
        <DotGrid />

        <div className="relative mx-auto grid w-full max-w-[1240px] items-center gap-14 px-5 py-20 sm:px-8 lg:grid-cols-[6fr_5fr] lg:py-28">
          <Reveal>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm font-medium text-mist-300 backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-electric-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-electric-400" />
              </span>
              Feita para pequenos negócios brasileiros
            </p>

            <h1
              style={{ fontFamily: "var(--font-sora)" }}
              className="mt-6 text-balance text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-[3.75rem]"
            >
              Seu negócio pronto para receber clientes.{" "}
              <span className="text-shimmer">
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
                className="group relative overflow-hidden rounded-xl bg-ember-500 px-7 py-3.5 text-base font-semibold text-night-950 shadow-[0_8px_30px_-8px_rgb(237_164_40/0.5)] transition-all hover:-translate-y-0.5 hover:bg-ember-400"
              >
                <span className="relative">Decolar grátis</span>
              </Link>
              <Link
                href="/exemplos"
                className="gradient-border rounded-xl px-7 py-3.5 text-base font-semibold text-mist-100 transition-colors hover:bg-white/5"
              >
                Ver uma página nascendo
              </Link>
            </div>

            <p className="mt-4 text-sm text-mist-500">
              Grátis para publicar sua primeira página. Sem cartão de crédito.
            </p>
          </Reveal>

          <Reveal delay={0.15}>
            <BrowserMock />
          </Reveal>
        </div>

        {/* Faixa dos nichos atendidos — fato verificável, não "clientes". */}
        <div className="relative border-y border-white/5 bg-night-950/40 py-5">
          <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
            <p className="mb-3 text-center text-xs font-medium uppercase tracking-widest text-mist-700">
              Composições prontas para estes segmentos
            </p>
            <Marquee>
              {Object.values(NICHE_LABELS).map((label) => (
                <span
                  key={label}
                  className="shrink-0 rounded-full border border-white/8 bg-night-850 px-5 py-2 text-sm font-medium text-mist-300"
                >
                  {label}
                </span>
              ))}
            </Marquee>
          </div>
        </div>
      </section>

      {/* ── Dor ──────────────────────────────────────────────────────────── */}
      <section className="relative border-b border-white/5">
        <div className="mx-auto w-full max-w-[1240px] px-5 py-24 sm:px-8">
          <Reveal>
            <h2
              style={{ fontFamily: "var(--font-sora)" }}
              className="max-w-2xl text-balance text-3xl font-bold tracking-tight sm:text-4xl"
            >
              Você sabe explicar seu negócio. Transformar isso em página é que
              custa caro.
            </h2>
          </Reveal>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              {
                icon: "💸",
                title: "Contratar é caro e demorado",
                text: "Orçamentos, prazos, idas e vindas — e a página fica pronta quando o momento já passou.",
              },
              {
                icon: "🧩",
                title: "Ferramentas genéricas cansam",
                text: "Editores de arrastar e soltar pedem que você vire designer. Não era esse o combinado.",
              },
              {
                icon: "🌫️",
                title: "Publicar é só o começo",
                text: "Sem medir visitas e contatos, você nunca sabe o que está funcionando de verdade.",
              },
            ].map((item, i) => (
              <Reveal key={item.title} delay={i * 0.08}>
                <SpotlightCard className="h-full p-7">
                  <span aria-hidden="true" className="text-2xl">
                    {item.icon}
                  </span>
                  <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
                  <p className="mt-2.5 leading-relaxed text-mist-500">
                    {item.text}
                  </p>
                </SpotlightCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Como funciona: bento ─────────────────────────────────────────── */}
      <section className="relative">
        <div className="mx-auto w-full max-w-[1240px] px-5 py-24 sm:px-8">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-widest text-electric-400">
              Como funciona
            </p>
            <h2
              style={{ fontFamily: "var(--font-sora)" }}
              className="mt-3 max-w-2xl text-balance text-3xl font-bold tracking-tight sm:text-4xl"
            >
              Três passos entre a sua cabeça e a sua página no ar
            </h2>
          </Reveal>

          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            <Reveal className="lg:col-span-2">
              <SpotlightCard className="h-full p-8">
                <StepNumber>1</StepNumber>
                <h3 className="mt-4 text-xl font-semibold">
                  Responda bem perguntado
                </h3>
                <p className="mt-3 max-w-lg leading-relaxed text-mist-500">
                  Um briefing que pergunta o que importa: sua oferta, seu
                  público, sua dor, seu diferencial. Cerca de 5 minutos no modo
                  rápido — e dá para responder falando, se preferir.
                </p>

                <div className="mt-6 grid gap-2.5">
                  {[
                    "Qual é o principal problema que o seu cliente quer resolver?",
                    "O que torna o seu negócio diferente dos concorrentes?",
                    "Que sensações a página deve transmitir?",
                  ].map((question) => (
                    <div
                      key={question}
                      className="rounded-xl border border-white/8 bg-night-800/60 px-4 py-3 text-sm text-mist-300"
                    >
                      {question}
                    </div>
                  ))}
                </div>
              </SpotlightCard>
            </Reveal>

            <Reveal delay={0.08}>
              <SpotlightCard className="h-full p-8">
                <StepNumber>2</StepNumber>
                <h3 className="mt-4 text-xl font-semibold">
                  Veja a página nascer
                </h3>
                <p className="mt-3 leading-relaxed text-mist-500">
                  A Decola compõe seções, cores e textos a partir das suas
                  respostas. Cada negócio recebe uma composição própria.
                </p>
                <div className="mt-6 flex gap-2">
                  {["#A6486B", "#0E7E74", "#F2814D", "#9D86FF"].map((color) => (
                    <span
                      key={color}
                      aria-hidden="true"
                      className="h-9 flex-1 rounded-lg"
                      style={{ background: color }}
                    />
                  ))}
                </div>
                <p className="mt-2 text-xs text-mist-700">
                  Paletas reais usadas pelo motor, por segmento.
                </p>
              </SpotlightCard>
            </Reveal>

            <Reveal delay={0.12}>
              <SpotlightCard className="h-full p-8">
                <StepNumber>3</StepNumber>
                <h3 className="mt-4 text-xl font-semibold">
                  Decole e acompanhe
                </h3>
                <p className="mt-3 leading-relaxed text-mist-500">
                  Publique em um clique no seu endereço Decola. Visitas, cliques
                  e contatos ficam no seu painel — dados reais, sempre.
                </p>
              </SpotlightCard>
            </Reveal>

            <Reveal delay={0.16} className="lg:col-span-2">
              <SpotlightCard className="h-full p-8">
                <h3 className="text-xl font-semibold">
                  O que você não informar, a Decola não inventa
                </h3>
                <p className="mt-3 max-w-xl leading-relaxed text-mist-500">
                  Sem depoimento fabricado, sem garantia falsa, sem preço que
                  você nunca aprovou. Se não há prova real, a seção simplesmente
                  não aparece na sua página.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {[
                    "Sem depoimento inventado",
                    "Sem número de mercado sem fonte",
                    "Sem promessa de venda garantida",
                  ].map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-electric-500/25 bg-electric-500/5 px-3.5 py-1.5 text-xs font-medium text-electric-300"
                    >
                      ✓ {item}
                    </span>
                  ))}
                </div>
              </SpotlightCard>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Exemplos reais do motor ──────────────────────────────────────── */}
      <section className="relative border-y border-white/5 bg-night-950/40">
        <div className="mx-auto w-full max-w-[1240px] px-5 py-24 sm:px-8">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-widest text-electric-400">
                  Exemplos
                </p>
                <h2
                  style={{ fontFamily: "var(--font-sora)" }}
                  className="mt-3 max-w-xl text-balance text-3xl font-bold tracking-tight sm:text-4xl"
                >
                  Cada negócio recebe uma página com personalidade própria
                </h2>
              </div>
              <Link
                href="/exemplos"
                className="text-sm font-semibold text-electric-300 hover:underline"
              >
                Ver todos os exemplos →
              </Link>
            </div>
          </Reveal>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {examples.map(({ fixture, doc }, i) => {
              const hero = doc.sections.find((s) => s.type === "hero");
              return (
                <Reveal key={fixture.slug} delay={i * 0.08}>
                  <Link
                    href={`/exemplos/${fixture.slug}`}
                    className="group block overflow-hidden rounded-2xl border border-white/10 transition-transform duration-300 hover:-translate-y-1"
                  >
                    <div
                      className="p-6"
                      style={{
                        background: doc.designTokens.palette.bg,
                        color: doc.designTokens.palette.text,
                      }}
                    >
                      <span
                        className="inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-medium"
                        style={{
                          borderColor: `${doc.designTokens.palette.muted}40`,
                          color: doc.designTokens.palette.muted,
                        }}
                      >
                        {doc.businessName}
                      </span>
                      <p
                        style={{ fontFamily: "var(--font-sora)" }}
                        className="mt-3 line-clamp-2 text-lg font-bold leading-snug"
                      >
                        {hero?.type === "hero"
                          ? hero.props.headline
                          : doc.businessName}
                      </p>
                      <span
                        className="mt-4 inline-block rounded-lg px-3.5 py-2 text-xs font-semibold"
                        style={{
                          background: doc.designTokens.palette.accent,
                          color: doc.designTokens.palette.accentContrast,
                        }}
                      >
                        {doc.primaryConversion.label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between bg-night-850 px-6 py-4">
                      <div>
                        <p className="text-sm font-semibold">{fixture.label}</p>
                        <p className="text-xs text-mist-500">
                          {fixture.nicheLabel}
                        </p>
                      </div>
                      <span className="text-sm text-electric-300 transition-transform group-hover:translate-x-1">
                        →
                      </span>
                    </div>
                  </Link>
                </Reveal>
              );
            })}
          </div>

          <Reveal>
            <p className="mt-8 text-center text-sm text-mist-500">
              Negócios fictícios, compostos pelo mesmo motor que gera as páginas
              reais — sem retoque manual.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── Voo Contínuo ─────────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-[1240px] px-5 py-24 sm:px-8">
        <Reveal>
          <SpotlightCard className="p-8 sm:p-12">
            <div className="flex flex-wrap items-center gap-3">
              <h2
                style={{ fontFamily: "var(--font-sora)" }}
                className="text-2xl font-bold tracking-tight sm:text-3xl"
              >
                Depois da decolagem, o Voo Contínuo
              </h2>
              <span className="rounded-full border border-ember-500/40 bg-ember-500/5 px-3 py-1 text-xs font-semibold text-ember-400">
                Em construção
              </span>
            </div>

            <p className="mt-4 max-w-2xl leading-relaxed text-mist-300">
              Observar o comportamento real dos visitantes, formular uma
              hipótese, testar uma variação e manter só o que comprovadamente
              funciona. Sem dados suficientes, a Decola diz “aguardando dados” —
              nunca inventa melhora.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-4">
              {[
                { step: "Observar", detail: "visitas e cliques reais" },
                { step: "Formular", detail: "uma hipótese por vez" },
                { step: "Testar", detail: "com amostra definida antes" },
                { step: "Decidir", detail: "manter, adotar ou reverter" },
              ].map((item) => (
                <div
                  key={item.step}
                  className="rounded-xl border border-white/8 bg-night-800/60 p-4"
                >
                  <p className="text-sm font-semibold text-electric-300">
                    {item.step}
                  </p>
                  <p className="mt-1 text-xs text-mist-500">{item.detail}</p>
                </div>
              ))}
            </div>

            <p className="mt-6 text-sm text-mist-500">
              O painel de métricas com visitas, cliques e leads já está no ar
              para todas as contas. Os testes automáticos chegam em seguida.
            </p>
          </SpotlightCard>
        </Reveal>
      </section>

      {/* ── Preços ───────────────────────────────────────────────────────── */}
      <section className="relative border-y border-white/5 bg-night-950/40">
        <div className="mx-auto w-full max-w-[1240px] px-5 py-24 sm:px-8">
          <Reveal>
            <h2
              style={{ fontFamily: "var(--font-sora)" }}
              className="text-balance text-3xl font-bold tracking-tight sm:text-4xl"
            >
              Comece grátis. Cresça quando fizer sentido.
            </h2>
          </Reveal>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[PLANS.free, PLANS.start, PLANS.pro].map((plan, i) => (
              <Reveal key={plan.id} delay={i * 0.08}>
                <SpotlightCard
                  className={`h-full p-7 ${
                    plan.highlight ? "ring-1 ring-ember-500/40" : ""
                  }`}
                >
                  {plan.highlight && (
                    <span className="absolute right-6 top-6 rounded-full bg-ember-500 px-3 py-1 text-xs font-bold text-night-950">
                      {plan.highlight}
                    </span>
                  )}
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  <p
                    style={{ fontFamily: "var(--font-sora)" }}
                    className="tabular mt-3 text-4xl font-bold tracking-tight"
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
                  <ul className="mt-6 grid gap-2.5 text-sm text-mist-300">
                    {[
                      plan.entitlements.maxPublishedPages ===
                      "unlimited_commercial"
                        ? "Páginas sem limite comercial"
                        : `${plan.entitlements.maxPublishedPages} página${Number(plan.entitlements.maxPublishedPages) > 1 ? "s" : ""} publicada${Number(plan.entitlements.maxPublishedPages) > 1 ? "s" : ""}`,
                      plan.entitlements.customDomain
                        ? "Domínio próprio"
                        : "Endereço Decola (subdomínio)",
                      plan.entitlements.showDecolaBadge
                        ? "Com marca Decola no rodapé"
                        : "Sem marca Decola",
                    ].map((line) => (
                      <li key={line} className="flex gap-2">
                        <span className="text-electric-400">✓</span>
                        {line}
                      </li>
                    ))}
                  </ul>
                </SpotlightCard>
              </Reveal>
            ))}
          </div>

          <Reveal>
            <p className="mt-8 text-center text-sm">
              <Link
                href="/precos"
                className="font-semibold text-electric-300 hover:underline"
              >
                Ver todos os planos e condições →
              </Link>
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── CTA final ────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <Aurora className="opacity-70" />
        <div className="relative mx-auto w-full max-w-[1240px] px-5 py-28 text-center sm:px-8">
          <Reveal>
            <h2
              style={{ fontFamily: "var(--font-sora)" }}
              className="mx-auto max-w-2xl text-balance text-3xl font-bold tracking-tight sm:text-5xl"
            >
              A sua página começa com uma boa pergunta
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg text-mist-300">
              Crie sua conta grátis, responda o briefing e veja sua página
              pronta para decolar.
            </p>
            <Link
              href="/cadastro"
              className="mt-9 inline-block rounded-xl bg-ember-500 px-8 py-4 text-lg font-semibold text-night-950 shadow-[0_8px_40px_-8px_rgb(237_164_40/0.55)] transition-all hover:-translate-y-0.5 hover:bg-ember-400"
            >
              Decolar grátis ✦
            </Link>
          </Reveal>
        </div>
      </section>
    </main>
  );
}

function StepNumber({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{ fontFamily: "var(--font-sora)" }}
      className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-electric-500/25 bg-electric-500/10 text-lg font-bold text-electric-300"
    >
      {children}
    </span>
  );
}

/** Demonstração do produto: composta com os tokens reais do motor. */
function BrowserMock() {
  return (
    <div
      aria-hidden="true"
      className="gradient-border relative mx-auto w-full max-w-md rounded-2xl bg-night-850 p-5 shadow-2xl lg:animate-float"
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
          Avaliação personalizada e tratamentos faciais com protocolo próprio.
        </p>
        <span className="mt-3 inline-block rounded-lg bg-[#C98A2D] px-4 py-2 text-[11px] font-semibold text-white">
          Chamar no WhatsApp
        </span>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {["Atendimento individual", "Ambiente preparado", "Protocolo próprio"].map(
            (item) => (
              <div
                key={item}
                className="rounded-lg border border-[#2B1F24]/8 bg-white p-2 text-[8px] font-medium leading-tight"
              >
                {item}
              </div>
            ),
          )}
        </div>
      </div>

      <p className="mt-3 text-center text-[10px] text-mist-700">
        Exemplo ilustrativo composto com os componentes reais da Decola
      </p>
    </div>
  );
}
