import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Badge, Button, Card } from "@/components/ui";
import { formatBRL } from "@/config/commercial-policy";
import type { OfferSnapshot } from "@/features/billing/apply-event";
import { getBalance } from "@/features/billing/credits";
import { getWorkspaceEntitlement } from "@/features/billing/entitlements";
import { requireWorkspace } from "@/server/auth";
import { getDb } from "@/server/db";
import { creditLedger, orders } from "@/server/db/schema";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Cobrança e Combustível" };

const LEDGER_LABEL: Record<string, string> = {
  grant: "Créditos adicionados",
  reserve: "Reservado para operação",
  commit: "Consumido",
  release: "Devolvido",
  expire: "Expirado",
  adjust: "Ajuste",
};

const ORDER_STATUS: Record<
  string,
  { label: string; tone: "neutral" | "success" | "warning" | "danger" }
> = {
  pending: { label: "Aguardando", tone: "neutral" },
  awaiting_payment: { label: "Confirmando pagamento", tone: "warning" },
  paid: { label: "Pago", tone: "success" },
  canceled: { label: "Cancelado", tone: "neutral" },
  expired: { label: "Expirado", tone: "neutral" },
  refunded: { label: "Reembolsado", tone: "danger" },
};

export default async function CobrancaPage() {
  const ctx = await requireWorkspace();
  const entitlement = await getWorkspaceEntitlement(ctx.workspaceId);
  const balance = await getBalance(ctx.workspaceId);
  const db = await getDb();

  const orderRows = await db.query.orders.findMany({
    where: eq(orders.workspaceId, ctx.workspaceId),
    orderBy: [desc(orders.createdAt)],
    limit: 10,
  });

  const ledgerRows = await db.query.creditLedger.findMany({
    where: eq(creditLedger.workspaceId, ctx.workspaceId),
    orderBy: [desc(creditLedger.createdAt)],
    limit: 20,
  });

  const plan = entitlement.plan;
  const creditsPolicy = plan.entitlements.monthlyCredits;

  return (
    <div className="grid gap-6">
      <div>
        <h1 style={{ fontFamily: "var(--font-sora)" }} className="text-3xl font-bold">
          Cobrança e Combustível
        </h1>
        <p className="mt-1 text-sm text-ink-600">
          Seu plano, seus créditos e o histórico de cada movimento.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[3fr_2fr]">
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-600">
                Plano atual
              </p>
              <p
                style={{ fontFamily: "var(--font-sora)" }}
                className="mt-1 text-2xl font-bold"
              >
                {plan.name}
              </p>
            </div>
            <Badge tone={plan.id === "free" ? "neutral" : "success"}>
              {plan.id === "free" ? "gratuito" : "ativo"}
            </Badge>
          </div>

          <ul className="mt-4 grid gap-1.5 text-sm text-ink-600">
            <li>
              {plan.entitlements.maxPublishedPages === "unlimited_commercial"
                ? "Páginas sem limite comercial"
                : `${plan.entitlements.maxPublishedPages} página(s) publicada(s)`}
            </li>
            <li>
              {plan.entitlements.customDomain
                ? "Domínio próprio disponível"
                : "Endereço Decola (subdomínio)"}
            </li>
            <li>
              {plan.entitlements.showDecolaBadge
                ? "Marca Decola no rodapé"
                : "Sem marca Decola"}
            </li>
          </ul>

          {entitlement.currentPeriodEndsAt && (
            <p className="mt-4 text-sm text-ink-600">
              Direitos válidos até{" "}
              <strong>
                {entitlement.currentPeriodEndsAt.toLocaleDateString("pt-BR", {
                  timeZone: "America/Sao_Paulo",
                })}
              </strong>
              .
            </p>
          )}

          {plan.id === "free" && (
            <Link href="/precos" className="mt-5 inline-block">
              <Button variant="commercial">Ver planos</Button>
            </Link>
          )}
        </Card>

        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-600">
            Combustível disponível
          </p>
          <p
            style={{ fontFamily: "var(--font-sora)" }}
            className="tabular mt-1 text-4xl font-bold"
          >
            {balance.available.toLocaleString("pt-BR")}
          </p>
          <dl className="mt-4 grid gap-1 text-sm text-ink-600">
            <div className="flex justify-between">
              <dt>Concedidos</dt>
              <dd className="tabular">{balance.granted}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Consumidos</dt>
              <dd className="tabular">−{balance.consumed}</dd>
            </div>
            {balance.reserved > 0 && (
              <div className="flex justify-between">
                <dt>Reservados agora</dt>
                <dd className="tabular">−{balance.reserved}</dd>
              </div>
            )}
            {balance.expired > 0 && (
              <div className="flex justify-between">
                <dt>Expirados</dt>
                <dd className="tabular">−{balance.expired}</dd>
              </div>
            )}
          </dl>
          {creditsPolicy.status === "draft" && (
            <p className="mt-4 rounded-lg bg-warning-600/10 px-3 py-2 text-xs text-warning-600">
              A quantidade de créditos por plano ainda está em definição
              comercial. O valor exibido nos planos é provisório e será
              confirmado antes da cobrança.
            </p>
          )}
        </Card>
      </div>

      <Card>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-600">
          Pedidos
        </h2>
        {orderRows.length === 0 ? (
          <p className="mt-3 text-sm text-ink-600">
            Nenhum pedido ainda. No plano Free você não paga nada.
          </p>
        ) : (
          <ul className="mt-3 grid gap-2">
            {orderRows.map((order) => {
              const snapshot = order.offerSnapshot as unknown as OfferSnapshot;
              const status = ORDER_STATUS[order.status] ?? ORDER_STATUS.pending;
              return (
                <li
                  key={order.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-900/10 px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium">{snapshot.label}</p>
                    <p className="text-xs text-ink-600">
                      {order.createdAt.toLocaleString("pt-BR", {
                        timeZone: "America/Sao_Paulo",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="tabular font-medium">
                      {formatBRL(order.amountCents)}
                    </span>
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-600">
          Histórico de Combustível
        </h2>
        {ledgerRows.length === 0 ? (
          <p className="mt-3 text-sm text-ink-600">
            Nenhum movimento ainda. Cada concessão, reserva e consumo aparece
            aqui.
          </p>
        ) : (
          <ul className="mt-3 grid gap-1.5">
            {ledgerRows.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between gap-3 border-b border-ink-900/5 py-2 text-sm last:border-0"
              >
                <div>
                  <p className="font-medium">
                    {LEDGER_LABEL[entry.kind] ?? entry.kind}
                  </p>
                  <p className="text-xs text-ink-600">
                    {entry.reason} ·{" "}
                    {entry.createdAt.toLocaleString("pt-BR", {
                      timeZone: "America/Sao_Paulo",
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <span
                  className={`tabular font-semibold ${
                    entry.amount >= 0 ? "text-success-600" : "text-ink-900"
                  }`}
                >
                  {entry.amount >= 0 ? "+" : ""}
                  {entry.amount}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
