import type { Metadata } from "next";
import { Reveal } from "@/components/marketing/reveal";
import { PLANS } from "@/config/commercial-policy";
import { ContactForm } from "@/features/marketplace/forms";

export const metadata: Metadata = {
  title: "Agências",
  description:
    "Gerencie páginas de vários clientes com a Decola. Contratação sob consulta.",
};

export default function AgenciasPage() {
  const plan = PLANS.agencia;

  return (
    <main className="interior-page relative mx-auto w-full max-w-[1240px] px-5 py-16 sm:px-8">
      <Reveal>
        <h1
          style={{ fontFamily: "var(--font-editorial)" }}
          className="page-heading max-w-2xl text-balance text-4xl font-bold tracking-tight sm:text-5xl"
        >
          Para quem cuida de vários negócios ao mesmo tempo
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-ink-600">
          Se você atende uma carteira de clientes, a Decola encurta o caminho
          entre o briefing e a página no ar de cada um deles.
        </p>
      </Reveal>

      <div className="mt-12 grid gap-10 lg:grid-cols-[3fr_2fr]">
        <Reveal delay={0.05}>
          <div className="grid gap-5">
            <div className="gradient-border rounded-2xl bg-card p-7">
              <h2 className="text-lg font-semibold">O que já funciona hoje</h2>
              <ul className="mt-3 grid gap-2 text-sm text-ink-600">
                <li>
                  ✓ Um workspace por cliente, com briefing, páginas e métricas
                  separados.
                </li>
                <li>
                  ✓ Convites de equipe com papéis (administrador, editor,
                  visualizador).
                </li>
                <li>✓ Editor manual e geração a partir do briefing.</li>
                <li>✓ Criativos e Diário de Bordo por página.</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-electric-500/20 bg-paper p-7">
              <h2 className="text-lg font-semibold text-electric-700">
                O que ainda não está pronto
              </h2>
              <ul className="mt-3 grid gap-2 text-sm text-ink-600">
                <li>
                  • Gestão centralizada de vários workspaces em um só painel.
                </li>
                <li>
                  • White-label parcial: hoje a marca Decola sai do rodapé nos
                  planos pagos, mas domínio de e-mail e login próprios exigem
                  infraestrutura que ainda não existe.
                </li>
                <li>• Revenda com faturamento consolidado.</li>
              </ul>
              <p className="mt-4 text-xs text-ink-600">
                Preferimos dizer isso agora a vender um benefício que você não
                receberia.
              </p>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="gradient-border rounded-2xl bg-card p-7">
            <h2
              style={{ fontFamily: "var(--font-sora)" }}
              className="text-xl font-bold"
            >
              Plano Agência
            </h2>
            <p className="mt-2 text-sm text-ink-600">
              {plan.sellableBlockedReason}
            </p>
            <p className="mt-4 mb-6 text-sm text-ink-600">
              Conte o seu cenário e retornamos com uma proposta quando o
              contrato estiver definido.
            </p>
            <ContactForm kind="agencia" />
          </div>
        </Reveal>
      </div>
    </main>
  );
}
