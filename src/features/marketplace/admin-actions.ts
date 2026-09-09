"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { requirePlatformAdmin } from "@/server/auth/admin";
import { getDb } from "@/server/db";
import {
  auditLog,
  professionalApplications,
  professionalProfiles,
  profiles,
} from "@/server/db/schema";
import { enqueueJob, kickDrain } from "@/server/jobs";
import { registerAllJobHandlers } from "@/server/jobs/handlers";

/**
 * Revisão de candidaturas (spec §15): perfil público só existe após aprovação
 * humana. A decisão é auditada e o candidato é avisado nos dois casos.
 */

export interface ReviewResult {
  ok: boolean;
  error?: string;
}

const reviewSchema = z.object({
  applicationId: z.string().uuid(),
  decision: z.enum(["approve", "reject"]),
  note: z.string().trim().max(500).optional(),
});

export async function reviewApplicationAction(
  _prev: ReviewResult,
  formData: FormData,
): Promise<ReviewResult> {
  const parsed = reviewSchema.safeParse({
    applicationId: formData.get("applicationId"),
    decision: formData.get("decision"),
    note: formData.get("note") ?? undefined,
  });
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };

  let admin;
  try {
    admin = await requirePlatformAdmin();
  } catch {
    return { ok: false, error: "Apenas a administração da plataforma revisa candidaturas." };
  }

  const db = await getDb();
  const application = await db.query.professionalApplications.findFirst({
    where: eq(professionalApplications.id, parsed.data.applicationId),
  });
  if (!application) return { ok: false, error: "Candidatura não encontrada." };
  if (application.status !== "submitted") {
    return { ok: false, error: "Esta candidatura já foi revisada." };
  }

  const approved = parsed.data.decision === "approve";

  // Aprovar exige um profile: o perfil público é vinculado a uma identidade.
  if (approved && !application.profileId) {
    const existing = await db.query.profiles.findFirst({
      where: eq(profiles.email, application.email),
    });
    if (!existing) {
      return {
        ok: false,
        error:
          "Esta pessoa ainda não tem conta na Decola. Peça que ela crie uma conta com o mesmo e-mail antes da aprovação.",
      };
    }
    application.profileId = existing.id;
  }

  await db.transaction(async (tx) => {
    await tx
      .update(professionalApplications)
      .set({
        status: approved ? "approved" : "rejected",
        reviewedBy: admin.profileId,
        reviewNote: parsed.data.note ?? null,
        reviewedAt: new Date(),
      })
      .where(eq(professionalApplications.id, application.id));

    if (approved && application.profileId) {
      await tx
        .insert(professionalProfiles)
        .values({
          profileId: application.profileId,
          applicationId: application.id,
          displayName: application.name,
          specialty: application.specialty,
          bio: application.experience.slice(0, 600),
          active: true,
        })
        .onConflictDoNothing({ target: professionalProfiles.profileId });
    }

    await tx.insert(auditLog).values({
      actorProfileId: admin.profileId,
      action: approved ? "marketplace.approve" : "marketplace.reject",
      target: application.id,
      meta: { email: application.email, note: parsed.data.note },
    });
  });

  registerAllJobHandlers();
  await enqueueJob({
    type: "send_email",
    payload: {
      to: application.email,
      template: approved ? "candidatura-aprovada" : "candidatura-recusada",
      subject: approved
        ? "Sua candidatura foi aprovada — Decola"
        : "Retorno sobre sua candidatura — Decola",
      html: approved
        ? `<h2>Candidatura aprovada</h2><p>Olá, ${application.name}. Seu perfil já está no catálogo de profissionais da Decola.</p><p>Acesse a área do profissional para ver solicitações e enviar propostas.</p>`
        : `<h2>Retorno sobre sua candidatura</h2><p>Olá, ${application.name}. Neste momento não seguiremos com sua candidatura.</p>${parsed.data.note ? `<p>${parsed.data.note}</p>` : ""}`,
      dedupKey: `application-review:${application.id}`,
    },
    dedupKey: `job-application-review:${application.id}`,
  });
  after(() => kickDrain());

  revalidatePath("/admin/profissionais");
  return { ok: true };
}
