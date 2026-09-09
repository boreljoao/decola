"use server";

import { createHash, randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { getWorkspacePlan } from "@/features/billing/entitlements";
import { env } from "@/config/env";
import { assertRole, requireUser, requireWorkspace } from "@/server/auth";
import { getDb } from "@/server/db";
import {
  auditLog,
  invitations,
  memberships,
  profiles,
  workspaces,
} from "@/server/db/schema";
import { enqueueJob, kickDrain } from "@/server/jobs";
import { registerAllJobHandlers } from "@/server/jobs/handlers";

/**
 * Equipe e convites (spec §15): expiração real, token guardado por hash,
 * aceite pela identidade correta, revogação e limite de assentos do plano.
 * O último owner não pode sair sem transferir a propriedade.
 */

const INVITE_TTL_DAYS = 7;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export interface TeamActionResult {
  ok: boolean;
  error?: string;
  inviteUrl?: string;
}

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email("Informe um e-mail válido."),
  role: z.enum(["admin", "editor", "viewer"]),
});

export async function inviteMemberAction(
  _prev: TeamActionResult,
  formData: FormData,
): Promise<TeamActionResult> {
  const parsed = inviteSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const ctx = await requireWorkspace();
  assertRole(ctx, "admin");
  const db = await getDb();

  const plan = await getWorkspacePlan(ctx.workspaceId);
  const currentMembers = await db.query.memberships.findMany({
    where: eq(memberships.workspaceId, ctx.workspaceId),
    columns: { profileId: true },
  });
  const pendingInvites = await db.query.invitations.findMany({
    where: and(
      eq(invitations.workspaceId, ctx.workspaceId),
      eq(invitations.status, "pending"),
    ),
    columns: { id: true },
  });

  if (currentMembers.length + pendingInvites.length >= plan.entitlements.seats) {
    return {
      ok: false,
      error: `Seu plano ${plan.name} inclui ${plan.entitlements.seats} assento(s). Remova um membro ou faça upgrade para convidar mais pessoas.`,
    };
  }

  // Já é membro?
  const existingProfile = await db.query.profiles.findFirst({
    where: eq(profiles.email, parsed.data.email),
  });
  if (existingProfile) {
    const already = await db.query.memberships.findFirst({
      where: and(
        eq(memberships.workspaceId, ctx.workspaceId),
        eq(memberships.profileId, existingProfile.id),
      ),
    });
    if (already) {
      return { ok: false, error: "Essa pessoa já faz parte do workspace." };
    }
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 3600 * 1000);

  await db.insert(invitations).values({
    workspaceId: ctx.workspaceId,
    email: parsed.data.email,
    role: parsed.data.role,
    tokenHash: hashToken(token),
    expiresAt,
    invitedBy: ctx.user.profileId,
  });

  const inviteUrl = `${env().APP_URL}/convite/${token}`;

  registerAllJobHandlers();
  await enqueueJob({
    type: "send_email",
    payload: {
      to: parsed.data.email,
      template: "convite-equipe",
      subject: `Você foi convidado para o workspace ${ctx.workspaceName} na Decola`,
      html:
        `<h2>Convite para colaborar</h2>` +
        `<p>Você foi convidado para o workspace <strong>${ctx.workspaceName}</strong> na Decola.</p>` +
        `<p><a href="${inviteUrl}">Aceitar convite</a></p>` +
        `<p>O convite expira em ${INVITE_TTL_DAYS} dias.</p>`,
      workspaceId: ctx.workspaceId,
      dedupKey: `invite:${hashToken(token)}`,
    },
    dedupKey: `job-invite:${hashToken(token)}`,
  });
  after(() => kickDrain());

  await db.insert(auditLog).values({
    workspaceId: ctx.workspaceId,
    actorProfileId: ctx.user.profileId,
    action: "team.invite",
    target: parsed.data.email,
    meta: { role: parsed.data.role },
  });

  revalidatePath("/app/equipe");
  // O link é devolvido para o ambiente de desenvolvimento, onde o e-mail vai
  // para o outbox local em vez da caixa de entrada real.
  return {
    ok: true,
    inviteUrl: env().capabilities.resendEmail ? undefined : inviteUrl,
  };
}

export async function revokeInviteAction(
  invitationId: string,
): Promise<TeamActionResult> {
  const db = await getDb();
  const invite = await db.query.invitations.findFirst({
    where: eq(invitations.id, invitationId),
  });
  if (!invite) return { ok: false, error: "Convite não encontrado." };

  const ctx = await requireWorkspace(invite.workspaceId);
  assertRole(ctx, "admin");

  await db
    .update(invitations)
    .set({ status: "revoked" })
    .where(eq(invitations.id, invitationId));

  revalidatePath("/app/equipe");
  return { ok: true };
}

/** Aceite do convite: exige sessão E que o e-mail bata com o convidado. */
export async function acceptInviteAction(
  token: string,
): Promise<{ ok: boolean; error?: string; workspaceName?: string }> {
  const user = await requireUser();
  const db = await getDb();

  const invite = await db.query.invitations.findFirst({
    where: eq(invitations.tokenHash, hashToken(token)),
  });
  if (!invite) return { ok: false, error: "Convite inválido." };

  if (invite.status !== "pending") {
    return {
      ok: false,
      error:
        invite.status === "accepted"
          ? "Este convite já foi utilizado."
          : "Este convite não está mais válido.",
    };
  }
  if (invite.expiresAt <= new Date()) {
    await db
      .update(invitations)
      .set({ status: "expired" })
      .where(eq(invitations.id, invite.id));
    return { ok: false, error: "Este convite expirou. Peça um novo." };
  }
  // Conhecer o link não basta: o convite é nominal.
  if (invite.email !== user.email.toLowerCase()) {
    return {
      ok: false,
      error: `Este convite foi enviado para ${invite.email}. Entre com essa conta para aceitá-lo.`,
    };
  }

  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, invite.workspaceId),
  });

  await db.transaction(async (tx) => {
    await tx
      .insert(memberships)
      .values({
        workspaceId: invite.workspaceId,
        profileId: user.profileId,
        role: invite.role,
      })
      .onConflictDoNothing();
    await tx
      .update(invitations)
      .set({
        status: "accepted",
        acceptedBy: user.profileId,
        acceptedAt: new Date(),
      })
      .where(eq(invitations.id, invite.id));
    await tx.insert(auditLog).values({
      workspaceId: invite.workspaceId,
      actorProfileId: user.profileId,
      action: "team.invite_accepted",
      target: invite.id,
    });
  });

  return { ok: true, workspaceName: workspace?.name };
}

export async function removeMemberAction(
  profileId: string,
): Promise<TeamActionResult> {
  const ctx = await requireWorkspace();
  assertRole(ctx, "admin");
  const db = await getDb();

  const target = await db.query.memberships.findFirst({
    where: and(
      eq(memberships.workspaceId, ctx.workspaceId),
      eq(memberships.profileId, profileId),
    ),
  });
  if (!target) return { ok: false, error: "Membro não encontrado." };

  if (target.role === "owner") {
    const owners = await db.query.memberships.findMany({
      where: and(
        eq(memberships.workspaceId, ctx.workspaceId),
        eq(memberships.role, "owner"),
      ),
      columns: { profileId: true },
    });
    if (owners.length <= 1) {
      return {
        ok: false,
        error:
          "Este é o último owner do workspace. Transfira a propriedade antes de remover.",
      };
    }
  }

  await db
    .delete(memberships)
    .where(
      and(
        eq(memberships.workspaceId, ctx.workspaceId),
        eq(memberships.profileId, profileId),
      ),
    );

  await db.insert(auditLog).values({
    workspaceId: ctx.workspaceId,
    actorProfileId: ctx.user.profileId,
    action: "team.member_removed",
    target: profileId,
  });

  revalidatePath("/app/equipe");
  return { ok: true };
}
