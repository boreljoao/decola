import type { Metadata } from "next";
import Link from "next/link";
import { desc } from "drizzle-orm";
import { Badge, Button, Card, EmptyState } from "@/components/ui";
import { formatBRL } from "@/config/commercial-policy";
import { getPlatformAdmin } from "@/server/auth/admin";
import { getDb } from "@/server/db";
import {
  auditLog,
  jobs,
  orders,
  privacyRequests,
  webhookInbox,
} from "@/server/db/schema";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Administração",
  robots: { index: false },
};

/**
 * Painel administrativo (spec §16). Somente leitura nesta versão: edição
 * direta de saldo ou registro financeiro é proibida, e reprocessar job não
 * pode repetir cobrança — por isso nenhuma ação destrutiva é exposta aqui.
 */
export default async function AdminPage() {
  const admin = await getPlatformAdmin();
  if (!admin) {
    return (
      <div className="mx-auto max-w-lg px-6 py-24">
        <Card className="text-center">
          <h1
            style={{ fontFamily: "var(--font-sora)" }}
            className="text-2xl font-bold"
          >
            Acesso restrito
          </h1>
          <p className="mt-2 text-sm text-ink-600">
            Esta área é da administração da plataforma. Se você acredita que
            deveria ter acesso, fale com quem administra a Decola.
          </p>
          <Link href="/app" className="mt-6 inline-block">
            <Button variant="secondary">Voltar ao painel</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const db = await getDb();

  const [profileRows, workspaceRows, orderRows, jobRows, inboxRows, privacyRows, auditRows] =
    await Promise.all([
      db.query.profiles.findMany({ columns: { id: true, platformAdmin: true } }),
      db.query.workspaces.findMany({ columns: { id: true } }),
      db.query.orders.findMany({
        orderBy: [desc(orders.createdAt)],
        limit: 10,
      }),
      db.query.jobs.findMany({ orderBy: [desc(jobs.createdAt)], limit: 200 }),
      db.query.webhookInbox.findMany({
        orderBy: [desc(webhookInbox.receivedAt)],
        limit: 10,
      }),
      db.query.privacyRequests.findMany({
        orderBy: [desc(privacyRequests.createdAt)],
        limit: 10,
      }),
      db.query.auditLog.findMany({
        orderBy: [desc(auditLog.createdAt)],
        limit: 20,
      }),
    ]);

  const failedJobs = jobRows.filter((j) => j.status === "failed");
  const pendingJobs = jobRows.filter((j) => j.status === "pending");
  const runningJobs = jobRows.filter((j) => j.status === "running");
  const unprocessedWebhooks = inboxRows.filter((w) => !w.processedAt);

  const stats = [
    { label: "Contas", value: profileRows.length },
    { label: "Workspaces", value: workspaceRows.length },
    { label: "Jobs na fila", value: pendingJobs.length },
    { label: "Jobs falhos", value: failedJobs.length, alert: failedJobs.length > 0 },
  ];

  return (
    <div className="mx-auto grid max-w-[1240px] gap-6 px-6 py-10">
      <div>
        <h1 style={{ fontFamily: "var(--font-sora)" }} className="text-3xl font-bold">
          Administração
        </h1>
        <p className="mt-1 text-sm text-ink-600">
          Visão operacional da plataforma. Somente leitura: saldos e registros
          financeiros não podem ser editados por aqui.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-600">
              {s.label}
            </p>
            <p
              style={{ fontFamily: "var(--font-sora)" }}
              className={`tabular mt-1 text-3xl font-bold ${
                s.alert ? "text-danger-600" : ""
              }`}
            >
              {s.value}
            </p>
          </Card>
        ))}
      </div>

      <Card>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-600">
          Saúde da fila
        </h2>
        <p className="mt-2 text-sm text-ink-600">
          {runningJobs.length} em execução · {pendingJobs.length} aguardando ·{" "}
          {failedJobs.length} falhos
        </p>
        {failedJobs.length > 0 && (
          <ul className="mt-4 grid gap-2">
            {failedJobs.slice(0, 5).map((job) => (
              <li
                key={job.id}
                className="rounded-xl border border-danger-600/30 bg-danger-600/5 px-4 py-3 text-sm"
              >
                <p className="font-medium">{job.type}</p>
                <p className="mt-1 text-xs text-ink-600">
                  {job.attempts} tentativa(s) · {job.lastError?.slice(0, 160)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-600">
          Reconciliação de pagamentos
        </h2>
        {unprocessedWebhooks.length > 0 && (
          <p className="mt-2 text-sm font-medium text-warning-600">
            {unprocessedWebhooks.length} webhook(s) recebido(s) sem
            processamento concluído.
          </p>
        )}
        {orderRows.length === 0 ? (
          <p className="mt-3 text-sm text-ink-600">Nenhum pedido registrado.</p>
        ) : (
          <ul className="mt-3 grid gap-2">
            {orderRows.map((order) => (
              <li
                key={order.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-900/10 px-4 py-3 text-sm"
              >
                <span className="font-mono text-xs">{order.id.slice(0, 8)}</span>
                <span className="tabular">{formatBRL(order.amountCents)}</span>
                <span className="text-xs text-ink-600">{order.provider}</span>
                <Badge tone={order.status === "paid" ? "success" : "neutral"}>
                  {order.status}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-600">
          Solicitações de privacidade
        </h2>
        {privacyRows.length === 0 ? (
          <p className="mt-3 text-sm text-ink-600">Nenhuma solicitação.</p>
        ) : (
          <ul className="mt-3 grid gap-2">
            {privacyRows.map((request) => (
              <li
                key={request.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-ink-900/10 px-4 py-3 text-sm"
              >
                <span>
                  {request.kind === "export" ? "Exportação" : "Exclusão"} ·{" "}
                  {request.createdAt.toLocaleString("pt-BR", {
                    timeZone: "America/Sao_Paulo",
                  })}
                </span>
                <Badge
                  tone={request.status === "completed" ? "success" : "warning"}
                >
                  {request.status}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-600">
          Auditoria recente
        </h2>
        {auditRows.length === 0 ? (
          <EmptyState
            title="Sem eventos registrados"
            description="Ações sensíveis aparecem aqui com autor, alvo e horário."
          />
        ) : (
          <ul className="mt-3 grid gap-1.5">
            {auditRows.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between gap-3 border-b border-ink-900/5 py-2 text-sm last:border-0"
              >
                <span className="font-medium">{entry.action}</span>
                <span className="text-xs text-ink-600">
                  {entry.createdAt.toLocaleString("pt-BR", {
                    timeZone: "America/Sao_Paulo",
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
