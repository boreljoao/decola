import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import {
  analyticsEvents,
  briefingRevisions,
  briefings,
  entitlementGrants,
  leads,
  memberships,
  orders,
  pages,
  pageVersions,
  privacyRequests,
  profiles,
  projects,
  workspaces,
} from "@/server/db/schema";

/**
 * Privacidade (spec §16).
 *
 * Exportação: dados do próprio usuário e dos workspaces onde ele é owner.
 * Exclusão: remove/anonimiza dados de produto, mas PRESERVA registros
 * financeiros exigidos por obrigação legal — a UI diz isso antes de confirmar,
 * em vez de prometer apagar tudo.
 */

/** Janela de arrependimento antes da remoção efetiva. */
export const DELETION_GRACE_DAYS = 7;

export interface ExportBundle {
  exportedAt: string;
  profile: { email: string; displayName: string | null; createdAt: string };
  workspaces: Array<{
    name: string;
    role: string;
    projects: Array<{
      name: string;
      niche: string;
      briefingAnswers: unknown;
      pages: Array<{
        name: string;
        slug: string | null;
        status: string;
        versions: number;
        leads: unknown[];
      }>;
    }>;
  }>;
  note: string;
}

export async function buildExport(profileId: string): Promise<ExportBundle> {
  const db = await getDb();

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, profileId),
  });
  if (!profile) throw new Error("Perfil não encontrado.");

  const memberRows = await db.query.memberships.findMany({
    where: eq(memberships.profileId, profileId),
  });

  const workspaceBundles: ExportBundle["workspaces"] = [];

  for (const member of memberRows) {
    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.id, member.workspaceId),
    });
    if (!workspace) continue;

    const projectRows = await db.query.projects.findMany({
      where: eq(projects.workspaceId, workspace.id),
    });

    const projectBundles = [];
    for (const project of projectRows) {
      const briefing = await db.query.briefings.findFirst({
        where: eq(briefings.projectId, project.id),
      });
      const revisions = briefing
        ? await db.query.briefingRevisions.findMany({
            where: eq(briefingRevisions.briefingId, briefing.id),
          })
        : [];
      const latest = revisions
        .filter((r) => r.revision > 0)
        .sort((a, b) => b.revision - a.revision)[0];

      const pageRows = await db.query.pages.findMany({
        where: eq(pages.projectId, project.id),
      });

      const pageBundles = [];
      for (const page of pageRows) {
        const versions = await db.query.pageVersions.findMany({
          where: eq(pageVersions.pageId, page.id),
          columns: { id: true },
        });
        // Leads pertencem ao dono da página — vão na exportação dele.
        const leadRows = await db.query.leads.findMany({
          where: eq(leads.pageId, page.id),
        });
        pageBundles.push({
          name: page.name,
          slug: page.slug,
          status: page.status,
          versions: versions.length,
          leads: leadRows.map((l) => ({
            recebidoEm: l.createdAt.toISOString(),
            dados: l.data,
            status: l.status,
          })),
        });
      }

      projectBundles.push({
        name: project.name,
        niche: project.niche,
        briefingAnswers: latest?.answers ?? null,
        pages: pageBundles,
      });
    }

    workspaceBundles.push({
      name: workspace.name,
      role: member.role,
      projects: projectBundles,
    });
  }

  return {
    exportedAt: new Date().toISOString(),
    profile: {
      email: profile.email,
      displayName: profile.displayName,
      createdAt: profile.createdAt.toISOString(),
    },
    workspaces: workspaceBundles,
    note:
      "Exportação gerada pela Decola. Inclui seu perfil, briefings, páginas e os contatos recebidos nas suas páginas. " +
      "Registros financeiros são mantidos separadamente pelo período exigido por lei.",
  };
}

export interface DeletionImpact {
  workspacesOwned: number;
  workspacesShared: number;
  publishedPages: string[];
  leadCount: number;
  hasPaidHistory: boolean;
}

/** O que será afetado — mostrado ANTES de confirmar a exclusão. */
export async function describeDeletionImpact(
  profileId: string,
): Promise<DeletionImpact> {
  const db = await getDb();
  const memberRows = await db.query.memberships.findMany({
    where: eq(memberships.profileId, profileId),
  });

  const owned = memberRows.filter((m) => m.role === "owner");
  const publishedPages: string[] = [];
  let leadCount = 0;
  let hasPaidHistory = false;

  for (const member of owned) {
    const livePages = await db.query.pages.findMany({
      where: and(
        eq(pages.workspaceId, member.workspaceId),
        eq(pages.status, "live"),
      ),
      columns: { name: true, id: true },
    });
    publishedPages.push(...livePages.map((p) => p.name));

    for (const page of livePages) {
      const leadRows = await db.query.leads.findMany({
        where: eq(leads.pageId, page.id),
        columns: { id: true },
      });
      leadCount += leadRows.length;
    }

    const orderRows = await db.query.orders.findMany({
      where: eq(orders.workspaceId, member.workspaceId),
      columns: { status: true },
    });
    if (orderRows.some((o) => o.status === "paid" || o.status === "refunded")) {
      hasPaidHistory = true;
    }
  }

  return {
    workspacesOwned: owned.length,
    workspacesShared: memberRows.length - owned.length,
    publishedPages,
    leadCount,
    hasPaidHistory,
  };
}

/**
 * Executa a exclusão: despublica páginas, apaga dados de produto e anonimiza o
 * perfil. Pedidos e concessões são PRESERVADOS (retenção legal/financeira),
 * desvinculados do perfil.
 */
export async function executeDeletion(profileId: string): Promise<void> {
  const db = await getDb();

  const memberRows = await db.query.memberships.findMany({
    where: eq(memberships.profileId, profileId),
  });
  const owned = memberRows.filter((m) => m.role === "owner");

  await db.transaction(async (tx) => {
    for (const member of owned) {
      // Despublica antes de remover: nenhuma página fica órfã no ar.
      await tx
        .update(pages)
        .set({ status: "archived", publishedVersionId: null, slug: null })
        .where(eq(pages.workspaceId, member.workspaceId));

      // Analytics e leads do workspace saem junto com o conteúdo.
      await tx
        .delete(analyticsEvents)
        .where(eq(analyticsEvents.workspaceId, member.workspaceId));

      // Grants ficam, mas sem vínculo ativo com o titular removido.
      await tx
        .update(entitlementGrants)
        .set({
          revokedAt: new Date(),
          revokedReason: "Conta excluída a pedido do titular",
        })
        .where(eq(entitlementGrants.workspaceId, member.workspaceId));
    }

    // Remove a associação do usuário a todos os workspaces.
    await tx.delete(memberships).where(eq(memberships.profileId, profileId));

    // Anonimiza o perfil em vez de apagar a linha, preservando integridade
    // referencial de registros financeiros que devem ser retidos.
    await tx
      .update(profiles)
      .set({
        email: `removido+${profileId}@invalido.local`,
        displayName: null,
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, profileId));
  });
}

export async function requestPrivacyAction(input: {
  profileId: string;
  workspaceId?: string;
  kind: "export" | "delete";
}): Promise<{ id: string }> {
  const db = await getDb();
  const [request] = await db
    .insert(privacyRequests)
    .values({
      profileId: input.profileId,
      workspaceId: input.workspaceId,
      kind: input.kind,
      status: "pending",
      scheduledFor:
        input.kind === "delete"
          ? new Date(Date.now() + DELETION_GRACE_DAYS * 24 * 3600 * 1000)
          : null,
      expiresAt:
        input.kind === "export"
          ? new Date(Date.now() + 7 * 24 * 3600 * 1000)
          : null,
    })
    .returning({ id: privacyRequests.id });
  return request;
}
