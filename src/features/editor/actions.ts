"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  validatePageDocument,
  type PageDocument,
} from "@/features/generation/page-document";
import {
  commitCredits,
  getBalance,
  releaseCredits,
  reserveCredits,
} from "@/features/billing/credits";
import { requireWorkspace, assertRole } from "@/server/auth";
import { getDb } from "@/server/db";
import { auditLog, pages, pageVersions } from "@/server/db/schema";
import { proposeAiEdit, type AiEditResult } from "./ai-edit";
import { AI_EDIT_CREDIT_COST } from "./pricing";

/**
 * Ações do editor (spec §9): salvar cria uma NOVA versão (nunca publica);
 * alterações concorrentes entre abas provocam conflito explícito via
 * baseVersionId; restaurar cria versão com source "rollback".
 */

async function loadPageAuthorized(pageId: string) {
  const db = await getDb();
  const page = await db.query.pages.findFirst({ where: eq(pages.id, pageId) });
  if (!page) throw new Error("Página não encontrada.");
  const ctx = await requireWorkspace(page.workspaceId);
  assertRole(ctx, "editor");
  return { db, page, ctx };
}

export interface SaveVersionResult {
  ok: boolean;
  versionId?: string;
  version?: number;
  error?: string;
  conflict?: boolean;
}

export async function saveManualVersionAction(input: {
  pageId: string;
  baseVersionId: string;
  document: unknown;
  source?: "manual_edit" | "ai_edit";
}): Promise<SaveVersionResult> {
  try {
    const { db, page, ctx } = await loadPageAuthorized(input.pageId);

    if (page.currentVersionId !== input.baseVersionId) {
      return {
        ok: false,
        conflict: true,
        error:
          "A página foi alterada em outra aba ou por outra pessoa. Recarregue o editor para continuar sobre a versão mais recente.",
      };
    }

    const validation = validatePageDocument(input.document);
    if (!validation.ok) {
      return {
        ok: false,
        error: `Documento inválido: ${validation.issues.slice(0, 3).join("; ")}`,
      };
    }

    const result = await db.transaction(async (tx) => {
      const existing = await tx.query.pageVersions.findMany({
        where: eq(pageVersions.pageId, page.id),
        columns: { version: true },
      });
      const nextVersion =
        existing.reduce((m, v) => Math.max(m, v.version), 0) + 1;

      const [version] = await tx
        .insert(pageVersions)
        .values({
          pageId: page.id,
          workspaceId: page.workspaceId,
          version: nextVersion,
          document: validation.document as unknown as Record<string, unknown>,
          source: input.source ?? "manual_edit",
          createdBy: ctx.user.profileId,
        })
        .returning();

      await tx
        .update(pages)
        .set({ currentVersionId: version.id, updatedAt: new Date() })
        .where(eq(pages.id, page.id));

      await tx.insert(auditLog).values({
        workspaceId: page.workspaceId,
        actorProfileId: ctx.user.profileId,
        action: input.source === "ai_edit" ? "page.ai_edit" : "page.manual_edit",
        target: page.id,
        meta: { versionId: version.id, version: nextVersion },
      });

      return version;
    });

    return { ok: true, versionId: result.id, version: result.version };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Falha ao salvar.",
    };
  }
}

export async function restoreVersionAction(input: {
  pageId: string;
  versionId: string;
}): Promise<SaveVersionResult> {
  try {
    const { db, page, ctx } = await loadPageAuthorized(input.pageId);
    const source = await db.query.pageVersions.findFirst({
      where: eq(pageVersions.id, input.versionId),
    });
    if (!source || source.pageId !== page.id) {
      return { ok: false, error: "Versão não encontrada." };
    }

    const result = await db.transaction(async (tx) => {
      const existing = await tx.query.pageVersions.findMany({
        where: eq(pageVersions.pageId, page.id),
        columns: { version: true },
      });
      const nextVersion =
        existing.reduce((m, v) => Math.max(m, v.version), 0) + 1;
      const [version] = await tx
        .insert(pageVersions)
        .values({
          pageId: page.id,
          workspaceId: page.workspaceId,
          version: nextVersion,
          document: source.document as Record<string, unknown>,
          source: "rollback",
          createdBy: ctx.user.profileId,
        })
        .returning();
      await tx
        .update(pages)
        .set({ currentVersionId: version.id, updatedAt: new Date() })
        .where(eq(pages.id, page.id));
      await tx.insert(auditLog).values({
        workspaceId: page.workspaceId,
        actorProfileId: ctx.user.profileId,
        action: "page.restore_version",
        target: page.id,
        meta: { fromVersionId: source.id, newVersionId: version.id },
      });
      return version;
    });

    return { ok: true, versionId: result.id, version: result.version };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Falha ao restaurar.",
    };
  }
}

const aiEditInput = z.object({
  pageId: z.string().uuid(),
  baseVersionId: z.string().uuid(),
  instruction: z.string().trim().min(4).max(1000),
  allowCommercialChanges: z.boolean(),
});

export type AiEditActionResult =
  | (AiEditResult & { ok: true; creditsCharged: number })
  | { ok: false; message: string; insufficientCredits?: boolean };

export async function aiEditProposalAction(
  raw: unknown,
): Promise<AiEditActionResult> {
  const parsed = aiEditInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: "Pedido inválido." };
  }

  let operationKey: string | undefined;
  try {
    const { db, page } = await loadPageAuthorized(parsed.data.pageId);
    if (page.currentVersionId !== parsed.data.baseVersionId) {
      return {
        ok: false,
        message:
          "A página mudou desde que o editor foi aberto. Recarregue antes de pedir uma edição por IA.",
      };
    }
    const version = await db.query.pageVersions.findFirst({
      where: eq(pageVersions.id, parsed.data.baseVersionId),
    });
    if (!version) return { ok: false, message: "Versão base não encontrada." };

    const validation = validatePageDocument(version.document);
    if (!validation.ok) {
      return { ok: false, message: "A versão base está inválida." };
    }

    // Reserva ANTES de chamar o provedor pago (spec §12.2). Cada pedido é uma
    // operação distinta: instruções diferentes não compartilham reserva.
    operationKey = `ai_edit:${crypto.randomUUID()}`;
    const reservation = await reserveCredits({
      workspaceId: page.workspaceId,
      amount: AI_EDIT_CREDIT_COST,
      operationKey,
    });
    if (!reservation.ok) {
      return {
        ok: false,
        insufficientCredits: true,
        message: `Combustível insuficiente: esta edição custa ${AI_EDIT_CREDIT_COST} crédito e você tem ${reservation.available}.`,
      };
    }

    const result = await proposeAiEdit({
      base: validation.document as PageDocument,
      instruction: parsed.data.instruction,
      allowCommercialChanges: parsed.data.allowCommercialChanges,
    });

    if (!result.ok) {
      // Falha do motor não cobra.
      await releaseCredits(operationKey);
      return { ok: false, message: result.message };
    }

    // Proposta válida entregue: é aqui que o crédito é consumido.
    await commitCredits(operationKey);
    return { ...result, creditsCharged: AI_EDIT_CREDIT_COST };
  } catch (err) {
    if (operationKey) await releaseCredits(operationKey).catch(() => {});
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Falha na edição por IA.",
    };
  }
}

/** Saldo e custo, para a UI mostrar antes de o usuário pedir a edição. */
export async function getAiEditCostInfo(
  pageId: string,
): Promise<{ cost: number; available: number }> {
  const { page } = await loadPageAuthorized(pageId);
  const balance = await getBalance(page.workspaceId);
  return { cost: AI_EDIT_CREDIT_COST, available: balance.available };
}
