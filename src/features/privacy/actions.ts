"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getAuthProvider, requireUser } from "@/server/auth";
import { getDb } from "@/server/db";
import { auditLog, privacyRequests } from "@/server/db/schema";
import {
  buildExport,
  describeDeletionImpact,
  executeDeletion,
  requestPrivacyAction,
  type DeletionImpact,
} from "./service";

/** Gera a exportação sob demanda e devolve o JSON para download. */
export async function exportMyDataAction(): Promise<{
  ok: boolean;
  json?: string;
  error?: string;
}> {
  try {
    const user = await requireUser();
    const bundle = await buildExport(user.profileId);
    const db = await getDb();
    const request = await requestPrivacyAction({
      profileId: user.profileId,
      kind: "export",
    });
    await db
      .update(privacyRequests)
      .set({ status: "completed", completedAt: new Date() })
      .where(eq(privacyRequests.id, request.id));
    await db.insert(auditLog).values({
      actorProfileId: user.profileId,
      action: "privacy.export",
      target: request.id,
    });
    return { ok: true, json: JSON.stringify(bundle, null, 2) };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Falha ao exportar.",
    };
  }
}

export async function deletionImpactAction(): Promise<DeletionImpact> {
  const user = await requireUser();
  return describeDeletionImpact(user.profileId);
}

/**
 * Exclusão de conta. Exige digitar o próprio e-mail como confirmação — é a
 * reautenticação possível no fluxo passwordless de desenvolvimento; com
 * Supabase Auth ativo, o provedor acrescenta o step-up dele.
 */
export async function deleteMyAccountAction(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const user = await requireUser();
  const confirmation = String(formData.get("confirmacao") ?? "")
    .trim()
    .toLowerCase();

  if (confirmation !== user.email.toLowerCase()) {
    return {
      error: "Digite exatamente o seu e-mail para confirmar a exclusão.",
    };
  }

  const db = await getDb();
  const request = await requestPrivacyAction({
    profileId: user.profileId,
    kind: "delete",
  });

  await executeDeletion(user.profileId);

  await db
    .update(privacyRequests)
    .set({ status: "completed", completedAt: new Date() })
    .where(eq(privacyRequests.id, request.id));
  await db.insert(auditLog).values({
    actorProfileId: null,
    action: "privacy.account_deleted",
    target: request.id,
  });

  await getAuthProvider().signOut();
  revalidatePath("/");
  return {};
}
