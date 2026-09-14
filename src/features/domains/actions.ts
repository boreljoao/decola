"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getWorkspacePlan } from "@/features/billing/entitlements";
import { assertRole, requireWorkspace } from "@/server/auth";
import { getDb } from "@/server/db";
import { auditLog, domains, pages } from "@/server/db/schema";
import {
  customDomainUnavailableReason,
  dnsInstructions,
  generateVerificationToken,
  normalizeHost,
  sslCapability,
  verifyDomainOwnership,
  verifyDomainTarget,
} from "./service";

export interface DomainActionResult {
  ok: boolean;
  error?: string;
  message?: string;
}

/** Vincula um domínio próprio à página, ainda não verificado. */
export async function addDomainAction(
  _prev: DomainActionResult,
  formData: FormData,
): Promise<DomainActionResult> {
  const pageId = String(formData.get("pageId") ?? "");
  const db = await getDb();
  const page = await db.query.pages.findFirst({ where: eq(pages.id, pageId) });
  if (!page) return { ok: false, error: "Página não encontrada." };

  const ctx = await requireWorkspace(page.workspaceId);
  assertRole(ctx, "admin");

  const plan = await getWorkspacePlan(page.workspaceId);
  if (!plan.entitlements.customDomain) {
    return {
      ok: false,
      error: `O plano ${plan.name} publica em endereço Decola. Domínio próprio faz parte dos planos pagos.`,
    };
  }

  const unavailable = customDomainUnavailableReason();
  if (unavailable) return { ok: false, error: unavailable };

  const normalized = normalizeHost(String(formData.get("host") ?? ""));
  if (!normalized.ok) return { ok: false, error: normalized.error };

  const existing = await db.query.domains.findFirst({
    where: eq(domains.host, normalized.host),
  });
  if (existing) {
    // Domínio já vinculado em qualquer workspace: não revelamos de quem é.
    return {
      ok: false,
      error:
        existing.pageId === page.id
          ? "Este domínio já está vinculado a esta página."
          : "Este domínio já está em uso. Se ele é seu, remova o vínculo anterior antes de conectá-lo aqui.",
    };
  }

  await db.insert(domains).values({
    workspaceId: page.workspaceId,
    pageId: page.id,
    host: normalized.host,
    verificationToken: generateVerificationToken(),
    status: "pending_verification",
  });

  await db.insert(auditLog).values({
    workspaceId: page.workspaceId,
    actorProfileId: ctx.user.profileId,
    action: "domain.add",
    target: normalized.host,
  });

  revalidatePath(`/app/paginas/${page.projectId}/publicacao`);
  return {
    ok: true,
    message:
      "Domínio adicionado. Crie os registros de DNS mostrados abaixo e depois clique em verificar.",
  };
}

/** Executa a verificação real: TXT de posse e apontamento. */
export async function verifyDomainAction(
  domainId: string,
): Promise<DomainActionResult> {
  const db = await getDb();
  const domain = await db.query.domains.findFirst({
    where: eq(domains.id, domainId),
  });
  if (!domain) return { ok: false, error: "Domínio não encontrado." };

  const ctx = await requireWorkspace(domain.workspaceId);
  assertRole(ctx, "admin");

  const ownership = await verifyDomainOwnership(
    domain.host,
    domain.verificationToken,
  );
  if (!ownership.ok) {
    await db
      .update(domains)
      .set({
        status: "pending_verification",
        lastCheckedAt: new Date(),
        lastError: ownership.reason,
      })
      .where(eq(domains.id, domainId));
    revalidatePath("/app");
    return { ok: false, error: ownership.reason };
  }

  const target = await verifyDomainTarget(domain.host);
  const ssl = sslCapability();

  // Posse comprovada. O estado seguinte depende do apontamento e do SSL.
  const nextStatus = !target.ok
    ? ("verified" as const)
    : ssl.available
      ? ("active" as const)
      : ("ssl_pending" as const);

  await db
    .update(domains)
    .set({
      status: nextStatus,
      verifiedAt: domain.verifiedAt ?? new Date(),
      activatedAt: nextStatus === "active" ? new Date() : null,
      lastCheckedAt: new Date(),
      lastError: target.ok ? null : target.reason,
    })
    .where(eq(domains.id, domainId));

  await db.insert(auditLog).values({
    workspaceId: domain.workspaceId,
    actorProfileId: ctx.user.profileId,
    action: "domain.verify",
    target: domain.host,
    meta: { status: nextStatus },
  });

  revalidatePath("/app");

  if (nextStatus === "active") {
    return { ok: true, message: "Domínio verificado e ativo." };
  }
  if (nextStatus === "ssl_pending") {
    return {
      ok: true,
      message: `Posse comprovada e apontamento correto. ${ssl.reason}`,
    };
  }
  return {
    ok: true,
    message: `Posse do domínio comprovada. ${target.ok ? "" : target.reason} Assim que o apontamento propagar, verifique novamente.`,
  };
}

/** Remove o vínculo, liberando o host para reuso após nova verificação. */
export async function removeDomainAction(
  domainId: string,
): Promise<DomainActionResult> {
  const db = await getDb();
  const domain = await db.query.domains.findFirst({
    where: eq(domains.id, domainId),
  });
  if (!domain) return { ok: false, error: "Domínio não encontrado." };

  const ctx = await requireWorkspace(domain.workspaceId);
  assertRole(ctx, "admin");

  // Remoção real da linha: o índice único libera o host, e um novo vínculo
  // exigirá nova verificação de posse (evita takeover silencioso).
  await db.delete(domains).where(eq(domains.id, domainId));

  await db.insert(auditLog).values({
    workspaceId: domain.workspaceId,
    actorProfileId: ctx.user.profileId,
    action: "domain.remove",
    target: domain.host,
  });

  revalidatePath("/app");
  return {
    ok: true,
    message:
      "Domínio desvinculado. Lembre-se de remover os registros de DNS que apontavam para a Decola.",
  };
}

/** Instruções de DNS para exibir na tela. */
export async function getDnsInstructions(domainId: string) {
  const db = await getDb();
  const domain = await db.query.domains.findFirst({
    where: eq(domains.id, domainId),
  });
  if (!domain) return null;
  await requireWorkspace(domain.workspaceId);
  return dnsInstructions(domain.host, domain.verificationToken);
}
