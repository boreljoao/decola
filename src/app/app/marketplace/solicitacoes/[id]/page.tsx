import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { Badge, Card, EmptyState } from "@/components/ui";
import { formatBRL } from "@/config/commercial-policy";
import {
  ESCROW_BLOCKED_REASON,
  marketplaceCommissionNote,
} from "@/features/marketplace/policy";
import {
  CloseRequestButton,
  ProposalActions,
} from "@/features/marketplace/request-ui";
import { requireWorkspace } from "@/server/auth";
import { getDb } from "@/server/db";
import {
  professionalProfiles,
  profiles,
  proposals,
  serviceRequests,
} from "@/server/db/schema";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Solicitação" };

export default async function SolicitacaoPage(
  props: PageProps<"/app/marketplace/solicitacoes/[id]">,
) {
  const { id } = await props.params;
  const db = await getDb();

  const request = await db.query.serviceRequests.findFirst({
    where: eq(serviceRequests.id, id),
  });
  if (!request) notFound();

  // Fronteira: só quem participa do workspace vê a solicitação.
  await requireWorkspace(request.workspaceId);

  const proposalRows = await db
    .select({
      id: proposals.id,
      priceCents: proposals.priceCents,
      deliveryDays: proposals.deliveryDays,
      scope: proposals.scope,
      accepted: proposals.accepted,
      createdAt: proposals.createdAt,
      professionalName: professionalProfiles.displayName,
      specialty: professionalProfiles.specialty,
      professionalEmail: profiles.email,
    })
    .from(proposals)
    .innerJoin(
      professionalProfiles,
      eq(proposals.professionalId, professionalProfiles.id),
    )
    .innerJoin(profiles, eq(professionalProfiles.profileId, profiles.id))
    .where(eq(proposals.requestId, request.id))
    .orderBy(desc(proposals.createdAt));

  const contracted = request.status === "contracted";
  const accepted = proposalRows.find((p) => p.accepted);

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-600">
          <Link href="/app/marketplace" className="hover:underline">
            Marketplace
          </Link>{" "}
          / Solicitação
        </p>
        <h1 style={{ fontFamily: "var(--font-sora)" }} className="mt-1 text-3xl font-bold">
          {request.title}
        </h1>
      </div>

      <Card>
        <p className="whitespace-pre-line text-sm text-ink-600">
          {request.description}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Badge tone={contracted ? "success" : "info"}>
            {contracted ? "Contratada" : "Recebendo propostas"}
          </Badge>
          {request.status !== "closed" && !contracted && (
            <CloseRequestButton requestId={request.id} />
          )}
        </div>
      </Card>

      {accepted && (
        <Card className="border-success-600/30">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-success-600">
            Proposta aceita
          </h2>
          <p className="mt-2 text-sm">
            <strong>{accepted.professionalName}</strong> —{" "}
            {formatBRL(accepted.priceCents)} em até {accepted.deliveryDays} dias.
          </p>
          <p className="mt-3 rounded-xl bg-paper p-4 text-sm text-ink-600">
            Combine os próximos passos diretamente:{" "}
            <a
              href={`mailto:${accepted.professionalEmail}`}
              className="font-medium text-electric-600 hover:underline"
            >
              {accepted.professionalEmail}
            </a>
          </p>
          <p className="mt-3 text-xs text-warning-600">
            O pagamento é combinado entre vocês. {ESCROW_BLOCKED_REASON}
          </p>
        </Card>
      )}

      {proposalRows.length === 0 ? (
        <EmptyState
          title="Nenhuma proposta ainda"
          description="Profissionais aprovados veem sua solicitação e podem enviar propostas com preço, prazo e escopo."
        />
      ) : (
        <div className="grid gap-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-600">
            Propostas recebidas ({proposalRows.length})
          </h2>
          {proposalRows.map((proposal) => (
            <Card
              key={proposal.id}
              className={proposal.accepted ? "border-success-600/40" : undefined}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{proposal.professionalName}</p>
                  <p className="text-xs text-electric-600">{proposal.specialty}</p>
                </div>
                <div className="text-right">
                  <p className="tabular text-lg font-bold">
                    {formatBRL(proposal.priceCents)}
                  </p>
                  <p className="text-xs text-ink-600">
                    até {proposal.deliveryDays} dias
                  </p>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-line rounded-xl bg-paper p-4 text-sm text-ink-600">
                {proposal.scope}
              </p>
              <div className="mt-4">
                {proposal.accepted ? (
                  <Badge tone="success">Aceita</Badge>
                ) : (
                  <ProposalActions
                    proposalId={proposal.id}
                    alreadyContracted={contracted}
                  />
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <p className="text-xs text-ink-600">{marketplaceCommissionNote()}</p>
    </div>
  );
}
