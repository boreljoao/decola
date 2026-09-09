import type { Metadata } from "next";
import Link from "next/link";
import { Aurora } from "@/components/marketing/aurora";
import { Reveal } from "@/components/marketing/reveal";
import { SpotlightCard } from "@/components/marketing/spotlight-card";
import { formatBRL, PLANS, type PlanDef } from "@/config/commercial-policy";
import { CheckoutButtons } from "@/features/billing/checkout-buttons";
import {
  paymentAvailability,
  type ProviderAvailability,
} from "@/features/billing/provider-registry";

export const metadata: Metadata = {
  title: "Preços",
  description:
    "Planos da Decola: comece grátis e evolua com Start, Pro e Business.",
};

/**
 * Preços (spec §3/§5.2): valores reais do catálogo comercial. Planos sem
 * caminho de venda ativo aparecem com o estado verdadeiro — nunca um checkout
 * que finge funcionar.
 */

function PlanCard({
  plan,
  delay,
  providers,
}: {
  plan: PlanDef;
  delay: number;
  providers: ProviderAvailability[];
}) {
  const e = plan.entitlements;
  const monthly = plan.monthlyPriceCents.value;
  const rows: string[] = [
    e.maxPublishedPages === "unlimited_commercial"
      ? "Páginas sem limite comercial (limites técnicos antiabuso transparentes)"
      : `${e.maxPublishedPages} página${Number(e.maxPublishedPages) > 1 ? "s" : ""} publicada${Number(e.maxPublishedPages) > 1 ? "s" : ""}`,
    e.customDomain ? "Domínio próprio" : "Endereço Decola (subdomínio)",
    e.showDecolaBadge ? "Com marca Decola no rodapé" : "Sem marca Decola",
    ...(e.vooContinuo ? ["Voo Contínuo (elegível por tráfego)"] : []),
    ...(e.creativesPerMonth.value > 0
      ? [`${e.creativesPerMonth.value} criativos/mês${e.creativesPerMonth.status === "draft" ? " (franquia em definição)" : ""}`]
      : []),
    `${e.seats} ${e.seats > 1 ? "assentos" : "assento"}`,
    ...(e.api ? ["API de integração"] : []),
  ];

  return (
    <Reveal delay={delay}>
      <SpotlightCard
        className={`flex h-full flex-col p-7 ${
          plan.highlight ? "ring-1 ring-ember-500/40" : ""
        }`}
      >
        {plan.highlight && (
          <span className="absolute -top-3 left-6 rounded-full bg-ember-500 px-3 py-1 text-xs font-bold text-night-950">
            {plan.highlight}
          </span>
        )}
        <h2 className="text-lg font-semibold">{plan.name}</h2>
        <p
          style={{ fontFamily: "var(--font-sora)" }}
          className="tabular mt-3 text-3xl font-bold"
        >
          {plan.id === "vitalicio"
            ? `${formatBRL(plan.oneTimePriceCents!.value)} único`
            : monthly == null
              ? "Sob consulta"
              : monthly === 0
                ? "R$ 0"
                : formatBRL(monthly)}
          {monthly != null && monthly > 0 && (
            <span className="text-base font-normal text-mist-500">/mês</span>
          )}
        </p>
        {plan.annualPriceCents.value != null && plan.annualPriceCents.value > 0 && (
          <p className="mt-1 text-xs text-mist-500">
            Anual: {formatBRL(plan.annualPriceCents.value)} cobrados uma vez ao
            ano (equivale a {formatBRL(Math.round(plan.annualPriceCents.value / 12))}/mês)
          </p>
        )}
        <ul className="mt-5 grid flex-1 gap-2.5 text-sm text-mist-300">
          {rows.map((r) => (
            <li key={r} className="flex gap-2">
              <span className="text-electric-400">✓</span>
              {r}
            </li>
          ))}
        </ul>
        <div className="mt-6">
          {plan.id === "free" ? (
            <Link
              href="/cadastro"
              className="block rounded-xl bg-ember-500 py-3 text-center text-sm font-semibold text-night-950 transition-colors hover:bg-ember-400"
            >
              Decolar grátis
            </Link>
          ) : (
            <CheckoutButtons
              planId={plan.id as "start" | "pro" | "business"}
              period="monthly"
              providers={providers}
              blockedReason={
                plan.sellable ? undefined : plan.sellableBlockedReason
              }
            />
          )}
        </div>
      </SpotlightCard>
    </Reveal>
  );
}

export default function PrecosPage() {
  const providers = paymentAvailability();
  const ordered = [PLANS.free, PLANS.start, PLANS.pro, PLANS.business];
  return (
    <main className="relative mx-auto w-full max-w-[1240px] px-5 py-16 sm:px-8">
      <Aurora className="opacity-60" />
      <Reveal>
        <h1
          style={{ fontFamily: "var(--font-sora)" }}
          className="relative max-w-2xl text-balance text-4xl font-bold tracking-tight sm:text-5xl"
        >
          Preços diretos, sem letra miúda
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-mist-300">
          Publique sua primeira página grátis. Os planos pagos removem a marca
          Decola, liberam domínio próprio e ampliam os limites.
        </p>
      </Reveal>

      <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {ordered.map((plan, i) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            delay={i * 0.06}
            providers={providers}
          />
        ))}
      </div>

      <Reveal>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-white/8 bg-night-850 p-7">
            <h2 className="text-lg font-semibold">Vitalício — R$ 297 único</h2>
            <p className="mt-3 text-sm leading-relaxed text-mist-300">
              Licença de uma página estática, com hospedagem anual cobrada à
              parte. Não inclui otimização contínua nem recarga mensal de
              créditos.
            </p>
            <p className="mt-3 text-xs text-mist-500">
              Disponível quando o valor anual de hospedagem for definido e
              exibido — sem surpresa depois da compra.
            </p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-night-850 p-7">
            <h2 className="text-lg font-semibold">Agência</h2>
            <p className="mt-3 text-sm leading-relaxed text-mist-300">
              Revenda e gestão de clientes com white-label parcial. Contratação
              sob consulta enquanto contrato e preço estão em definição.
            </p>
            <Link
              href="/cadastro"
              className="mt-4 inline-block text-sm font-semibold text-electric-300 hover:underline"
            >
              Falar com a Decola →
            </Link>
          </div>
        </div>
      </Reveal>

      <Reveal>
        <section className="mt-16">
          <h2
            style={{ fontFamily: "var(--font-sora)" }}
            className="text-2xl font-bold"
          >
            Perguntas frequentes
          </h2>
          <div className="mt-6 grid max-w-3xl gap-3">
            {[
              {
                q: "O plano Free é grátis para sempre?",
                a: "Sim. Você publica 1 página em um endereço Decola, com a marca Decola no rodapé. O upgrade acontece quando você quiser remover a marca, usar domínio próprio ou acessar recursos pagos.",
              },
              {
                q: "O que acontece se eu cancelar um plano pago?",
                a: "Seus rascunhos são preservados. Você escolhe qual página continua publicada nos limites do Free, a marca Decola volta ao rodapé e os benefícios pagos são removidos ao fim do período já quitado.",
              },
              {
                q: "A cobrança anual é parcelada?",
                a: "Não. O plano anual custa 10 vezes a mensalidade, cobrado de uma vez por 12 meses de acesso — mostramos sempre o total e o equivalente mensal.",
              },
              {
                q: "A Decola garante vendas ou resultados?",
                a: "Não — e desconfie de quem garante. A Decola entrega uma página bem construída a partir do seu briefing e dados reais de visitas e contatos para você decidir com clareza.",
              },
            ].map((item) => (
              <details
                key={item.q}
                className="group rounded-2xl border border-white/8 bg-night-850 p-5"
              >
                <summary className="cursor-pointer list-none font-semibold [&::-webkit-details-marker]:hidden">
                  <span className="mr-2 inline-block text-electric-400 transition-transform group-open:rotate-90">
                    ▸
                  </span>
                  {item.q}
                </summary>
                <p className="mt-3 leading-relaxed text-mist-300">{item.a}</p>
              </details>
            ))}
          </div>
        </section>
      </Reveal>
    </main>
  );
}
