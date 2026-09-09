import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Badge, Button, Card, EmptyState } from "@/components/ui";
import { formatBRL } from "@/config/commercial-policy";
import { ESCROW_BLOCKED_REASON } from "@/features/marketplace/policy";
import { ProposalForm } from "@/features/marketplace/request-ui";
import { listOpenRequestsForProfessional } from "@/features/marketplace/requests";
import { getCurrentUser } from "@/server/auth";
import { getDb } from "@/server/db";
import { professionalProfiles, proposals, serviceRequests } from "@/server/db/schema";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Área do profissional",
  robots: { index: false },
};

/**
 * Área do profissional (spec §15). O profissional vê apenas as solicitações
 * abertas e as próprias propostas — nunca cobrança, leads ou outras páginas
 * dos workspaces clientes.
 */
export default async function ProPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <Shell>
        <Card className="text-center">
          <h1 style={{ fontFamily: "var(--font-sora)" }} className="text-2xl font-bold">
            Área do profissional
          </h1>
          <p className="mt-2 text-sm text-ink-600">
            Entre com a conta usada na sua candidatura.
          </p>
          <Link href="/entrar?next=/pro" className="mt-6 inline-block">
            <Button>Entrar</Button>
          </Link>
        </Card>
      </Shell>
    );
  }

  const db = await getDb();
  const professional = await db.query.professionalProfiles.findFirst({
    where: eq(professionalProfiles.profileId, user.profileId),
  });

  if (!professional) {
    return (
      <Shell>
        <Card className="text-center">
          <h1 style={{ fontFamily: "var(--font-sora)" }} className="text-2xl font-bold">
            Você ainda não é um profissional aprovado
          </h1>
          <p className="mt-2 text-sm text-ink-600">
            Toda candidatura passa por revisão manual. Se você já se candidatou,
            aguarde o retorno por e-mail.
          </p>
          <Link href="/profissionais" className="mt-6 inline-block">
            <Button variant="secondary">Ver como funciona</Button>
          </Link>
        </Card>
      </Shell>
    );
  }

  if (!professional.active) {
    return (
      <Shell>
        <Card className="text-center">
          <h1 style={{ fontFamily: "var(--font-sora)" }} className="text-2xl font-bold">
            Seu perfil está inativo
          </h1>
          <p className="mt-2 text-sm text-ink-600">
            Fale com a administração da Decola para reativá-lo.
          </p>
        </Card>
      </Shell>
    );
  }

  const openRequests = await listOpenRequestsForProfessional();

  const myProposals = await db
    .select({
      id: proposals.id,
      priceCents: proposals.priceCents,
      deliveryDays: proposals.deliveryDays,
      accepted: proposals.accepted,
      requestTitle: serviceRequests.title,
      requestStatus: serviceRequests.status,
      requestId: serviceRequests.id,
    })
    .from(proposals)
    .innerJoin(serviceRequests, eq(proposals.requestId, serviceRequests.id))
    .where(eq(proposals.professionalId, professional.id))
    .orderBy(desc(proposals.createdAt));

  const proposedIds = new Set(myProposals.map((p) => p.requestId));

  return (
    <Shell>
      <div>
        <h1 style={{ fontFamily: "var(--font-sora)" }} className="text-3xl font-bold">
          Área do profissional
        </h1>
        <p className="mt-1 text-sm text-ink-600">
          {professional.displayName} · {professional.specialty}
        </p>
      </div>

      {myProposals.length > 0 && (
        <Card>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-600">
            Minhas propostas
          </h2>
          <ul className="mt-4 grid gap-2">
            {myProposals.map((proposal) => (
              <li
                key={proposal.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-900/10 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {proposal.requestTitle}
                  </p>
                  <p className="tabular text-xs text-ink-600">
                    {formatBRL(proposal.priceCents)} · {proposal.deliveryDays} dias
                  </p>
                </div>
                <Badge tone={proposal.accepted ? "success" : "neutral"}>
                  {proposal.accepted ? "Aceita" : "Aguardando"}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-600">
          Solicitações abertas
        </h2>
        {openRequests.length === 0 ? (
          <EmptyState
            title="Nenhuma solicitação aberta"
            description="Quando um cliente publicar um pedido, ele aparece aqui para você enviar uma proposta."
          />
        ) : (
          <div className="grid gap-4">
            {openRequests.map((request) => (
              <Card key={request.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h3 className="text-lg font-semibold">{request.title}</h3>
                  <span className="text-xs text-ink-600">{request.createdAt}</span>
                </div>
                <p className="mt-2 whitespace-pre-line text-sm text-ink-600">
                  {request.description}
                </p>
                <div className="mt-5 border-t border-ink-900/10 pt-4">
                  {proposedIds.has(request.id) ? (
                    <p className="text-sm text-ink-600">
                      Você já enviou uma proposta. Enviar de novo atualiza a
                      anterior.
                    </p>
                  ) : null}
                  <div className="mt-3">
                    <ProposalForm requestId={request.id} />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <p className="rounded-xl bg-warning-600/10 px-4 py-3 text-xs text-warning-600">
        {ESCROW_BLOCKED_REASON}
      </p>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper text-ink-900">
      <header className="border-b border-ink-900/10 bg-card">
        <div className="mx-auto flex w-full max-w-[900px] items-center justify-between px-6 py-4">
          <Link
            href="/"
            style={{ fontFamily: "var(--font-sora)" }}
            className="text-lg font-bold tracking-tight"
          >
            decola<span className="text-electric-600">✦</span>
          </Link>
          <span className="text-sm text-ink-600">Área do profissional</span>
        </div>
      </header>
      <main className="mx-auto grid w-full max-w-[900px] gap-6 px-6 py-10">
        {children}
      </main>
    </div>
  );
}
