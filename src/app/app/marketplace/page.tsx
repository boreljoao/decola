import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Badge, Card, EmptyState } from "@/components/ui";
import { NewRequestForm } from "@/features/marketplace/request-ui";
import { ESCROW_BLOCKED_REASON } from "@/features/marketplace/policy";
import { requireWorkspace } from "@/server/auth";
import { getDb } from "@/server/db";
import {
  professionalProfiles,
  projects,
  proposals,
  serviceRequests,
} from "@/server/db/schema";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Marketplace" };

const STATUS: Record<
  string,
  { label: string; tone: "neutral" | "info" | "success" | "warning" }
> = {
  open: { label: "Aberta", tone: "info" },
  proposed: { label: "Com propostas", tone: "warning" },
  contracted: { label: "Contratada", tone: "success" },
  delivered: { label: "Entregue", tone: "success" },
  closed: { label: "Encerrada", tone: "neutral" },
  canceled: { label: "Cancelada", tone: "neutral" },
};

export default async function MarketplacePage() {
  const ctx = await requireWorkspace();
  const db = await getDb();

  const requests = await db.query.serviceRequests.findMany({
    where: eq(serviceRequests.workspaceId, ctx.workspaceId),
    orderBy: [desc(serviceRequests.createdAt)],
    limit: 20,
  });

  const counts = new Map<string, number>();
  for (const request of requests) {
    const rows = await db.query.proposals.findMany({
      where: eq(proposals.requestId, request.id),
      columns: { id: true },
    });
    counts.set(request.id, rows.length);
  }

  const available = await db.query.professionalProfiles.findMany({
    where: eq(professionalProfiles.active, true),
    limit: 12,
  });

  const projectRows = await db.query.projects.findMany({
    where: eq(projects.workspaceId, ctx.workspaceId),
    columns: { id: true, name: true },
  });

  return (
    <div className="grid gap-6">
      <div>
        <h1 style={{ fontFamily: "var(--font-sora)" }} className="text-3xl font-bold">
          Marketplace
        </h1>
        <p className="mt-1 text-sm text-ink-600">
          Peça ajuda de um profissional para ajustar sua página, escrever textos
          ou cuidar dos anúncios.
        </p>
      </div>

      <Card>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-600">
          Profissionais disponíveis
        </h2>
        {available.length === 0 ? (
          <p className="mt-3 text-sm text-ink-600">
            Ainda não há profissionais aprovados no catálogo. Você pode abrir uma
            solicitação mesmo assim — ela fica visível assim que alguém for
            aprovado. Não prometemos atendimento imediato.
          </p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {available.map((professional) => (
              <li
                key={professional.id}
                className="rounded-xl border border-ink-900/10 bg-paper p-4"
              >
                <p className="font-medium">{professional.displayName}</p>
                <p className="text-xs text-electric-600">{professional.specialty}</p>
                <p className="mt-2 line-clamp-3 text-sm text-ink-600">
                  {professional.bio}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-600">
          Abrir uma solicitação
        </h2>
        <div className="mt-4">
          <NewRequestForm projects={projectRows} />
        </div>
      </Card>

      {requests.length === 0 ? (
        <EmptyState
          title="Nenhuma solicitação ainda"
          description="Descreva o que você precisa e receba propostas com preço, prazo e escopo."
        />
      ) : (
        <Card>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-600">
            Suas solicitações
          </h2>
          <ul className="mt-4 grid gap-2">
            {requests.map((request) => {
              const status = STATUS[request.status] ?? STATUS.open;
              const count = counts.get(request.id) ?? 0;
              return (
                <li key={request.id}>
                  <Link
                    href={`/app/marketplace/solicitacoes/${request.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-900/10 px-4 py-3 transition-colors hover:bg-paper"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{request.title}</p>
                      <p className="text-xs text-ink-600">
                        {count} proposta(s) ·{" "}
                        {request.createdAt.toLocaleDateString("pt-BR", {
                          timeZone: "America/Sao_Paulo",
                        })}
                      </p>
                    </div>
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <p className="rounded-xl bg-warning-600/10 px-4 py-3 text-xs text-warning-600">
        {ESCROW_BLOCKED_REASON}
      </p>
    </div>
  );
}
