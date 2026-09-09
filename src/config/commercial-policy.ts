/**
 * Fonte única de regras comerciais (spec §3).
 * Valores em centavos BRL. Campos ainda não decididos pelo negócio ficam com
 * status "draft" (spec §3.1) — em produção, a oferta correspondente fica
 * indisponível para venda com explicação, sem bloquear o resto do produto.
 */

export type PolicyStatus = "approved" | "draft";

export interface PolicyValue<T> {
  status: PolicyStatus;
  value: T;
  /** Para draft: de onde veio o valor provisório (fixture de demo/teste). */
  note?: string;
}

export type PlanId =
  | "free"
  | "start"
  | "pro"
  | "business"
  | "agencia"
  | "vitalicio";

export interface PlanEntitlements {
  maxPublishedPages: number | "unlimited_commercial";
  customDomain: boolean;
  showDecolaBadge: boolean;
  vooContinuo: boolean;
  creativesPerMonth: PolicyValue<number>;
  monthlyCredits: PolicyValue<number>;
  seats: number;
  api: boolean;
}

export interface PlanDef {
  id: PlanId;
  name: string;
  /** Preço mensal em centavos; null = sob consulta / preço único à parte. */
  monthlyPriceCents: PolicyValue<number | null>;
  annualPriceCents: PolicyValue<number | null>;
  oneTimePriceCents?: PolicyValue<number>;
  sellable: boolean;
  sellableBlockedReason?: string;
  entitlements: PlanEntitlements;
  highlight?: string;
}

export const CATALOG_VERSION = "2026-09-09.1";

export const PLANS: Record<PlanId, PlanDef> = {
  free: {
    id: "free",
    name: "Free",
    monthlyPriceCents: { status: "approved", value: 0 },
    annualPriceCents: { status: "approved", value: 0 },
    sellable: true,
    entitlements: {
      maxPublishedPages: 1,
      customDomain: false,
      showDecolaBadge: true,
      vooContinuo: false,
      creativesPerMonth: { status: "approved", value: 0 },
      monthlyCredits: {
        status: "draft",
        value: 20,
        note: "Franquia de teste configurável — valor provisório de desenvolvimento.",
      },
      seats: 1,
      api: false,
    },
  },
  start: {
    id: "start",
    name: "Start",
    monthlyPriceCents: { status: "approved", value: 4900 },
    annualPriceCents: { status: "approved", value: 49000 },
    sellable: true,
    highlight: "Recomendado para começar",
    entitlements: {
      maxPublishedPages: 1,
      customDomain: true,
      showDecolaBadge: false,
      vooContinuo: true,
      creativesPerMonth: { status: "approved", value: 2 },
      monthlyCredits: {
        status: "draft",
        value: 100,
        note: "Quantidade de créditos por plano ainda não decidida pelo negócio.",
      },
      seats: 1,
      api: false,
    },
  },
  pro: {
    id: "pro",
    name: "Pro",
    monthlyPriceCents: { status: "approved", value: 12900 },
    annualPriceCents: { status: "approved", value: 129000 },
    sellable: true,
    entitlements: {
      maxPublishedPages: 5,
      customDomain: true,
      showDecolaBadge: false,
      vooContinuo: true,
      creativesPerMonth: {
        status: "draft",
        value: 8,
        note: "Franquia adicional do Pro ainda não decidida.",
      },
      monthlyCredits: { status: "draft", value: 300, note: "Não decidido." },
      seats: 3,
      api: false,
    },
  },
  business: {
    id: "business",
    name: "Business",
    monthlyPriceCents: { status: "approved", value: 34900 },
    annualPriceCents: { status: "approved", value: 349000 },
    sellable: true,
    entitlements: {
      maxPublishedPages: "unlimited_commercial",
      customDomain: true,
      showDecolaBadge: false,
      vooContinuo: true,
      creativesPerMonth: { status: "draft", value: 20, note: "Não decidido." },
      monthlyCredits: { status: "draft", value: 1000, note: "Não decidido." },
      seats: 10,
      api: true,
    },
  },
  agencia: {
    id: "agencia",
    name: "Agência",
    monthlyPriceCents: {
      status: "draft",
      value: null,
      note: "Sob consulta até definição de contrato e preço.",
    },
    annualPriceCents: { status: "draft", value: null },
    sellable: false,
    sellableBlockedReason:
      "Contratação comercial sob consulta até definição de contrato e preço.",
    entitlements: {
      maxPublishedPages: "unlimited_commercial",
      customDomain: true,
      showDecolaBadge: false,
      vooContinuo: true,
      creativesPerMonth: { status: "draft", value: 0 },
      monthlyCredits: { status: "draft", value: 0 },
      seats: 20,
      api: true,
    },
  },
  vitalicio: {
    id: "vitalicio",
    name: "Vitalício",
    monthlyPriceCents: { status: "approved", value: null },
    annualPriceCents: { status: "approved", value: null },
    oneTimePriceCents: { status: "approved", value: 29700 },
    sellable: false,
    sellableBlockedReason:
      "Checkout do Vitalício depende do valor anual de hospedagem, ainda não definido pelo negócio (spec §1.2).",
    entitlements: {
      maxPublishedPages: 1,
      customDomain: true,
      showDecolaBadge: false,
      vooContinuo: false,
      creativesPerMonth: { status: "approved", value: 0 },
      monthlyCredits: { status: "approved", value: 0 },
      seats: 1,
      api: false,
    },
  },
};

/** Comissão do marketplace: intervalo decidido, valor exato pendente (spec §15). */
export const MARKETPLACE_COMMISSION = {
  status: "draft" as PolicyStatus,
  minPct: 15,
  maxPct: 20,
  note: "Valor exato entre 15–20% registrado por contrato aceito.",
};

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
