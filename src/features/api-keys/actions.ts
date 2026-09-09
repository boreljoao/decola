"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getWorkspacePlan } from "@/features/billing/entitlements";
import { assertRole, requireWorkspace } from "@/server/auth";
import { getDb } from "@/server/db";
import { apiKeys, auditLog } from "@/server/db/schema";
import { API_SCOPES, type ApiScope } from "./scopes";
import { generateKey } from "./service";

export interface ApiKeyActionResult {
  ok: boolean;
  error?: string;
  /** Segredo em claro — devolvido UMA única vez, na criação. */
  secret?: string;
}

export async function createApiKeyAction(
  _prev: ApiKeyActionResult,
  formData: FormData,
): Promise<ApiKeyActionResult> {
  const ctx = await requireWorkspace();
  assertRole(ctx, "admin");

  const plan = await getWorkspacePlan(ctx.workspaceId);
  if (!plan.entitlements.api) {
    return {
      ok: false,
      error: `A API faz parte do plano Business. Seu plano atual é ${plan.name}.`,
    };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2 || name.length > 60) {
    return { ok: false, error: "Dê um nome de 2 a 60 caracteres para a chave." };
  }

  const scopes = API_SCOPES.filter((scope) =>
    formData.getAll("scopes").includes(scope),
  ) as ApiScope[];
  if (scopes.length === 0) {
    return { ok: false, error: "Selecione ao menos um escopo." };
  }

  const key = generateKey();
  const db = await getDb();

  await db.insert(apiKeys).values({
    workspaceId: ctx.workspaceId,
    name,
    prefix: key.prefix,
    keyHash: key.hash,
    scopes,
    createdBy: ctx.user.profileId,
  });

  await db.insert(auditLog).values({
    workspaceId: ctx.workspaceId,
    actorProfileId: ctx.user.profileId,
    action: "api_key.create",
    target: key.prefix,
    meta: { name, scopes },
  });

  revalidatePath("/app/integracoes");
  return { ok: true, secret: key.secret };
}

export async function revokeApiKeyAction(
  keyId: string,
): Promise<ApiKeyActionResult> {
  const ctx = await requireWorkspace();
  assertRole(ctx, "admin");
  const db = await getDb();

  const updated = await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.workspaceId, ctx.workspaceId)))
    .returning({ prefix: apiKeys.prefix });

  if (updated.length === 0) {
    return { ok: false, error: "Chave não encontrada." };
  }

  await db.insert(auditLog).values({
    workspaceId: ctx.workspaceId,
    actorProfileId: ctx.user.profileId,
    action: "api_key.revoke",
    target: updated[0].prefix,
  });

  revalidatePath("/app/integracoes");
  return { ok: true };
}
