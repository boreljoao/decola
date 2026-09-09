"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { assertRole, requireWorkspace } from "@/server/auth";
import { getDb } from "@/server/db";
import { auditLog, integrationConnections } from "@/server/db/schema";
import { INTEGRATIONS, type IntegrationKind } from "./definitions";

export interface IntegrationActionResult {
  ok: boolean;
  error?: string;
}

export async function connectIntegrationAction(
  _prev: IntegrationActionResult,
  formData: FormData,
): Promise<IntegrationActionResult> {
  const kind = String(formData.get("kind") ?? "") as IntegrationKind;
  const definition = INTEGRATIONS[kind];
  if (!definition) return { ok: false, error: "Integração desconhecida." };
  if (!definition.available) {
    return { ok: false, error: definition.unavailableReason };
  }

  const parsed = definition.schema.safeParse(formData.get("value"));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const ctx = await requireWorkspace();
  assertRole(ctx, "admin");
  const db = await getDb();

  await db
    .insert(integrationConnections)
    .values({
      workspaceId: ctx.workspaceId,
      kind,
      status: "connected",
      config: { id: parsed.data },
      lastCheckedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [integrationConnections.workspaceId, integrationConnections.kind],
      set: {
        status: "connected",
        config: { id: parsed.data },
        lastCheckedAt: new Date(),
        lastError: null,
        updatedAt: new Date(),
      },
    });

  await db.insert(auditLog).values({
    workspaceId: ctx.workspaceId,
    actorProfileId: ctx.user.profileId,
    action: "integration.connect",
    target: kind,
  });

  revalidatePath("/app/integracoes");
  return { ok: true };
}

export async function disconnectIntegrationAction(
  kind: string,
): Promise<IntegrationActionResult> {
  const ctx = await requireWorkspace();
  assertRole(ctx, "admin");
  const db = await getDb();

  await db
    .delete(integrationConnections)
    .where(
      and(
        eq(integrationConnections.workspaceId, ctx.workspaceId),
        eq(integrationConnections.kind, kind),
      ),
    );

  await db.insert(auditLog).values({
    workspaceId: ctx.workspaceId,
    actorProfileId: ctx.user.profileId,
    action: "integration.disconnect",
    target: kind,
  });

  revalidatePath("/app/integracoes");
  return { ok: true };
}
