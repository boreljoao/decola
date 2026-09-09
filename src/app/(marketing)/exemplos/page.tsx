import type { Metadata } from "next";
import Link from "next/link";
import { Aurora } from "@/components/marketing/aurora";
import { Reveal } from "@/components/marketing/reveal";
import { DEMO_FIXTURES } from "@/features/demo/fixtures";
import { generatePageDocument } from "@/features/generation/rules-engine";
import { hashAnswers } from "@/features/generation/pipeline";

export const metadata: Metadata = {
  title: "Exemplos",
  description:
    "Páginas de demonstração compostas pelo motor real da Decola a partir de briefings fictícios identificados.",
};

export default function ExemplosPage() {
  const examples = DEMO_FIXTURES.map((fixture) => {
    const doc = generatePageDocument({
      briefingRevisionId: fixture.revisionId,
      answersHash: hashAnswers(fixture.answers),
      answers: fixture.answers,
    });
    return { fixture, doc };
  });

  return (
    <main className="relative mx-auto w-full max-w-[1240px] px-5 py-16 sm:px-8">
      <Aurora className="opacity-60" />
      <Reveal>
        <h1
          style={{ fontFamily: "var(--font-sora)" }}
          className="relative max-w-2xl text-balance text-4xl font-bold tracking-tight sm:text-5xl"
        >
          Cada negócio recebe uma página com personalidade própria
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-mist-300">
          Os exemplos abaixo são <strong>demonstrações com negócios fictícios</strong>,
          compostas pelo mesmo motor que gera as páginas reais — sem depoimentos
          inventados e sem retoque manual.
        </p>
      </Reveal>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {examples.map(({ fixture, doc }, i) => (
          <Reveal key={fixture.slug} delay={i * 0.08}>
            <Link
              href={`/exemplos/${fixture.slug}`}
              className="gradient-border group block overflow-hidden rounded-2xl bg-night-850 transition-transform duration-300 hover:-translate-y-1"
            >
              {/* miniatura composta com os tokens reais do documento gerado */}
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
                  className="mt-3 text-lg font-bold leading-snug"
                >
                  {doc.sections[0]?.type === "hero"
                    ? doc.sections[0].props.headline
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
              <div className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="text-sm font-semibold text-mist-100">
                    {fixture.label}
                  </p>
                  <p className="text-xs text-mist-500">{fixture.nicheLabel}</p>
                </div>
                <span className="text-sm text-electric-300 transition-transform group-hover:translate-x-1">
                  Ver página →
                </span>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>

      <p className="mt-10 text-center text-sm text-mist-500">
        Conteúdo de demonstração. A sua página nasce do seu briefing.
      </p>
    </main>
  );
}
