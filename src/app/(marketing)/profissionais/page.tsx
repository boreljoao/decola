import type { Metadata } from "next";
import { Reveal } from "@/components/marketing/reveal";
import { listActiveProfessionals } from "@/features/marketplace/actions";
import { ProfessionalApplicationForm } from "@/features/marketplace/forms";
import {
  ESCROW_BLOCKED_REASON,
  marketplaceCommissionNote,
} from "@/features/marketplace/policy";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Profissionais",
  description:
    "Trabalhe com a Decola atendendo pequenos negócios brasileiros, ou encontre um profissional para cuidar da sua página.",
};

export default async function ProfissionaisPage() {
  const professionals = await listActiveProfessionals();

  return (
    <main className="mx-auto w-full max-w-[1240px] px-5 py-16 sm:px-8">
      <Reveal>
        <h1
          style={{ fontFamily: "var(--font-sora)" }}
          className="max-w-2xl text-balance text-4xl font-bold sm:text-5xl"
        >
          Profissionais que cuidam da página junto com você
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-mist-300">
          Quem prefere delegar pode contar com alguém de fora para ajustar a
          página, escrever textos ou cuidar dos anúncios.
        </p>
      </Reveal>

      <Reveal delay={0.05}>
        <section className="mt-12">
          <h2
            style={{ fontFamily: "var(--font-sora)" }}
            className="text-2xl font-bold"
          >
            Profissionais disponíveis
          </h2>
          {professionals.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-white/10 bg-night-850 p-7">
              <p className="text-mist-300">
                <strong className="text-mist-100">
                  Ainda não há profissionais aprovados no catálogo.
                </strong>{" "}
                Não exibimos perfis fictícios nem prometemos atendimento
                imediato: quando houver alguém aprovado, ele aparece aqui.
              </p>
              <p className="mt-3 text-sm text-mist-500">
                Se você é profissional, a candidatura abaixo já está aberta.
              </p>
            </div>
          ) : (
            <div className="mt-5 grid gap-5 md:grid-cols-3">
              {professionals.map((professional) => (
                <div
                  key={professional.id}
                  className="rounded-2xl border border-white/10 bg-night-850 p-6"
                >
                  <h3 className="text-lg font-semibold">
                    {professional.displayName}
                  </h3>
                  <p className="mt-1 text-sm text-electric-300">
                    {professional.specialty}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-mist-500">
                    {professional.bio}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </Reveal>

      <Reveal delay={0.1}>
        <section className="mt-16 grid gap-10 lg:grid-cols-[3fr_2fr]">
          <div className="rounded-2xl border border-white/10 bg-night-850 p-7 sm:p-9">
            <h2
              style={{ fontFamily: "var(--font-sora)" }}
              className="text-2xl font-bold"
            >
              Quero atender pelo marketplace
            </h2>
            <p className="mt-2 mb-7 text-sm text-mist-300">
              Toda candidatura passa por revisão manual antes de virar perfil
              público.
            </p>
            <ProfessionalApplicationForm />
          </div>

          <div className="grid content-start gap-5">
            <div className="rounded-2xl border border-white/10 bg-night-800 p-6">
              <h3 className="font-semibold">Como funciona</h3>
              <ol className="mt-3 grid list-decimal gap-2 pl-5 text-sm text-mist-300">
                <li>Você se candidata e passa por revisão.</li>
                <li>Aprovado, seu perfil entra no catálogo.</li>
                <li>Clientes abrem solicitações e você envia propostas.</li>
                <li>Com o aceite, o trabalho começa e a entrega é registrada.</li>
              </ol>
            </div>

            <div className="rounded-2xl border border-ember-500/30 bg-night-800 p-6">
              <h3 className="font-semibold text-ember-400">
                Sobre pagamento pela plataforma
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-mist-300">
                {ESCROW_BLOCKED_REASON}
              </p>
              <p className="mt-3 text-xs text-mist-500">
                {marketplaceCommissionNote()}
              </p>
            </div>
          </div>
        </section>
      </Reveal>
    </main>
  );
}
