"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { requireUser, requireWorkspace, assertRole } from "@/server/auth";
import { getDb } from "@/server/db";
import {
  auditLog,
  professionalProfiles,
  projects,
  proposals,
  serviceRequests,
} from "@/server/db/schema";
import { enqueueJob, kickDrain } from "@/server/jobs";
import { registerAllJobHandlers } from "@/server/jobs/handlers";
import { parseReaisToCents } from "./policy";

/**
 * Solicitações e propostas (spec §15).
 *
 * O que existe: cliente abre solicitação → profissionais aprovados enviam
 * proposta com preço/prazo/escopo → cliente aceita uma.
 *
 * O que NÃO existe: pagamento intermediado. Aceitar registra o combinado e
 * abre o contato direto; a Decola não intermedia dinheiro sem provedor de
 * split configurado (ver ./policy.ts).
 */

export interface RequestResult {
  ok: boolean;
  error?: string;
  requestId?: string;
}

const createRequestSchema = z.object({
  title: z.string().trim().min(5, "Descreva o pedido em poucas palavras.").max(120),
  description: z
    .string()
    .trim()
    .min(20, "Conte com mais detalhes o que você precisa.")
    .max(2000),
  projectId: z.string().uuid().optional().or(z.literal("")),
});

export async function createServiceRequestAction(
  _prev: RequestResult,
  formData: FormData,
): Promise<RequestResult> {
  const parsed = createRequestSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    projectId: formData.get("projectId") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const ctx = await requireWorkspace();
  assertRole(ctx, "editor");
  const db = await getDb();

  // Projeto informado precisa ser DO workspace (fronteira, spec §4).
  let projectId: string | null = null;
  if (parsed.data.projectId) {
    const project = await db.query.projects.findFirst({
      where: and(
        eq(projects.id, parsed.data.projectId),
        eq(projects.workspaceId, ctx.workspaceId),
      ),
    });
    if (!project) return { ok: false, error: "Projeto não encontrado." };
    projectId = project.id;
  }

  const [request] = await db
    .insert(serviceRequests)
    .values({
      workspaceId: ctx.workspaceId,
      projectId,
      createdBy: ctx.user.profileId,
      title: parsed.data.title,
      description: parsed.data.description,
      status: "open",
    })
    .returning({ id: serviceRequests.id });

  await db.insert(auditLog).values({
    workspaceId: ctx.workspaceId,
    actorProfileId: ctx.user.profileId,
    action: "marketplace.request_created",
    target: request.id,
  });

  revalidatePath("/app/marketplace");
  return { ok: true, requestId: request.id };
}

const proposalSchema = z.object({
  requestId: z.string().uuid(),
  priceCents: z
    .number()
    .int()
    .min(1000, "O valor mínimo é R$ 10,00.")
    .max(10_000_000),
  deliveryDays: z.number().int().min(1).max(180),
  scope: z
    .string()
    .trim()
    .min(20, "Descreva o que está incluído na proposta.")
    .max(2000),
});

/** Envia proposta. Só profissional aprovado e ativo pode. */
export async function submitProposalAction(
  _prev: RequestResult,
  formData: FormData,
): Promise<RequestResult> {
  const user = await requireUser();
  const db = await getDb();

  const professional = await db.query.professionalProfiles.findFirst({
    where: and(
      eq(professionalProfiles.profileId, user.profileId),
      eq(professionalProfiles.active, true),
    ),
  });
  if (!professional) {
    return {
      ok: false,
      error: "Apenas profissionais aprovados podem enviar propostas.",
    };
  }

  const parsed = proposalSchema.safeParse({
    requestId: formData.get("requestId"),
    priceCents: parseReaisToCents(String(formData.get("price") ?? "")),
    deliveryDays: Number(formData.get("deliveryDays")),
    scope: formData.get("scope"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const request = await db.query.serviceRequests.findFirst({
    where: eq(serviceRequests.id, parsed.data.requestId),
  });
  if (!request) return { ok: false, error: "Solicitação não encontrada." };
  if (request.status !== "open" && request.status !== "proposed") {
    return { ok: false, error: "Esta solicitação não aceita mais propostas." };
  }

  await db
    .insert(proposals)
    .values({
      requestId: request.id,
      professionalId: professional.id,
      priceCents: parsed.data.priceCents,
      deliveryDays: parsed.data.deliveryDays,
      scope: parsed.data.scope,
    })
    .onConflictDoUpdate({
      target: [proposals.requestId, proposals.professionalId],
      set: {
        priceCents: parsed.data.priceCents,
        deliveryDays: parsed.data.deliveryDays,
        scope: parsed.data.scope,
      },
    });

  if (request.status === "open") {
    await db
      .update(serviceRequests)
      .set({ status: "proposed" })
      .where(eq(serviceRequests.id, request.id));
  }

  registerAllJobHandlers();
  await enqueueJob({
    type: "send_email",
    payload: {
      to: user.email,
      template: "proposta-enviada",
      subject: "Proposta enviada — Decola",
      html: `<h2>Proposta enviada</h2><p>Sua proposta para “${request.title}” foi registrada. Você será avisado se ela for aceita.</p>`,
      dedupKey: `proposal:${request.id}:${professional.id}`,
    },
    dedupKey: `job-proposal:${request.id}:${professional.id}`,
  });
  after(() => kickDrain());

  revalidatePath("/pro");
  return { ok: true, requestId: request.id };
}

/**
 * Aceita uma proposta. Registra o combinado e libera o contato direto —
 * NÃO movimenta dinheiro (escrow bloqueado).
 */
export async function acceptProposalAction(
  proposalId: string,
): Promise<RequestResult> {
  const db = await getDb();
  const proposal = await db.query.proposals.findFirst({
    where: eq(proposals.id, proposalId),
  });
  if (!proposal) return { ok: false, error: "Proposta não encontrada." };

  const request = await db.query.serviceRequests.findFirst({
    where: eq(serviceRequests.id, proposal.requestId),
  });
  if (!request) return { ok: false, error: "Solicitação não encontrada." };

  const ctx = await requireWorkspace(request.workspaceId);
  assertRole(ctx, "editor");

  if (request.status === "contracted") {
    return { ok: false, error: "Esta solicitação já tem uma proposta aceita." };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(proposals)
      .set({ accepted: true })
      .where(eq(proposals.id, proposalId));
    await tx
      .update(serviceRequests)
      .set({ status: "contracted" })
      .where(eq(serviceRequests.id, request.id));
    await tx.insert(auditLog).values({
      workspaceId: request.workspaceId,
      actorProfileId: ctx.user.profileId,
      action: "marketplace.proposal_accepted",
      target: proposalId,
      meta: { priceCents: proposal.priceCents },
    });
  });

  revalidatePath(`/app/marketplace/solicitacoes/${request.id}`);
  return { ok: true, requestId: request.id };
}

export async function closeRequestAction(
  requestId: string,
): Promise<RequestResult> {
  const db = await getDb();
  const request = await db.query.serviceRequests.findFirst({
    where: eq(serviceRequests.id, requestId),
  });
  if (!request) return { ok: false, error: "Solicitação não encontrada." };
  const ctx = await requireWorkspace(request.workspaceId);
  assertRole(ctx, "editor");

  await db
    .update(serviceRequests)
    .set({ status: "closed" })
    .where(eq(serviceRequests.id, requestId));

  revalidatePath("/app/marketplace");
  return { ok: true };
}

/** Solicitações abertas visíveis ao profissional (sem dados do workspace). */
export async function listOpenRequestsForProfessional() {
  const db = await getDb();
  const rows = await db.query.serviceRequests.findMany({
    orderBy: [desc(serviceRequests.createdAt)],
    limit: 30,
  });
  return rows
    .filter((r) => r.status === "open" || r.status === "proposed")
    .map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      createdAt: r.createdAt.toLocaleDateString("pt-BR", {
        timeZone: "America/Sao_Paulo",
      }),
    }));
}
