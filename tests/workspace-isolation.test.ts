import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { applyPaymentEvent } from "@/features/billing/apply-event";
import { getBalance, grantCredits } from "@/features/billing/credits";
import { getWorkspaceEntitlement } from "@/features/billing/entitlements";
import { CATALOG_VERSION } from "@/config/commercial-policy";
import {
  analyticsEvents,
  assets,
  briefingRevisions,
  briefings,
  creditLedger,
  entitlementGrants,
  invitations,
  leads,
  orders,
  pages,
  pageVersions,
  projects,
} from "@/server/db/schema";
import { seedWorkspace, setupTestDb } from "./helpers/test-db";

/**
 * Invariante nº 1 da spec §19.1:
 * "Dois workspaces não acessam páginas, assets, leads, jobs, exports,
 *  contratos ou cobrança um do outro, inclusive via ORM/worker."
 *
 * Estes testes atacam a fronteira pelo lado dos DADOS: montam dois workspaces
 * completos e provam que toda consulta escopada por workspace devolve apenas o
 * que pertence a ela, e que operações de negócio não vazam entre elas.
 *
 * A autorização de sessão (requireWorkspace/assertRole) é exercitada nas
 * jornadas E2E; aqui o alvo é a camada onde um erro de escopo passaria
 * despercebido.
 */

let ctx: Awaited<ReturnType<typeof setupTestDb>>;
let alpha: { workspaceId: string; profileId: string };
let beta: { workspaceId: string; profileId: string };

/** Cria projeto + briefing + página + versão + lead + evento em um workspace. */
async function seedContent(
  db: Awaited<ReturnType<typeof setupTestDb>>["db"],
  workspaceId: string,
  profileId: string,
  label: string,
) {
  const [project] = await db
    .insert(projects)
    .values({
      workspaceId,
      name: `Projeto ${label}`,
      niche: "servicos_locais",
      createdBy: profileId,
    })
    .returning();

  const [briefing] = await db
    .insert(briefings)
    .values({ projectId: project.id, workspaceId, mode: "rapido" })
    .returning();

  await db.insert(briefingRevisions).values({
    briefingId: briefing.id,
    workspaceId,
    revision: 1,
    answers: { "identidade.nome": { value: label, origin: "user" } },
    answersHash: `hash-${label}`,
  });

  const [page] = await db
    .insert(pages)
    .values({
      projectId: project.id,
      workspaceId,
      name: `Página ${label}`,
      slug: `pagina-${label.toLowerCase()}`,
      status: "live",
    })
    .returning();

  const [version] = await db
    .insert(pageVersions)
    .values({
      pageId: page.id,
      workspaceId,
      version: 1,
      document: { businessName: label },
      source: "generation",
    })
    .returning();

  await db
    .update(pages)
    .set({ currentVersionId: version.id, publishedVersionId: version.id })
    .where(eq(pages.id, page.id));

  await db.insert(leads).values({
    workspaceId,
    pageId: page.id,
    data: { nome: `Cliente de ${label}`, telefone: "11999990000" },
    dedupKey: `lead-${label}`,
  });

  await db.insert(analyticsEvents).values({
    workspaceId,
    pageId: page.id,
    type: "page_view",
    eventKey: `event-${label}`,
    day: new Date().toISOString().slice(0, 10),
  });

  await db.insert(assets).values({
    workspaceId,
    projectId: project.id,
    kind: "image",
    storageKey: `workspaces/${workspaceId}/${label}.png`,
    mimeType: "image/png",
    bytes: 1024,
    width: 800,
    height: 600,
  });

  return { project, page, version };
}

beforeEach(async () => {
  ctx = await setupTestDb();
  const a = await seedWorkspace(ctx.db, "alpha");
  const b = await seedWorkspace(ctx.db, "beta");
  alpha = { workspaceId: a.workspace.id, profileId: a.profile.id };
  beta = { workspaceId: b.workspace.id, profileId: b.profile.id };
  await seedContent(ctx.db, alpha.workspaceId, alpha.profileId, "Alpha");
  await seedContent(ctx.db, beta.workspaceId, beta.profileId, "Beta");
});

afterEach(async () => {
  await ctx.close();
});

describe("isolamento de conteúdo entre workspaces", () => {
  it("projetos, páginas e versões de um workspace não aparecem no outro", async () => {
    const alphaProjects = await ctx.db.query.projects.findMany({
      where: eq(projects.workspaceId, alpha.workspaceId),
    });
    const alphaPages = await ctx.db.query.pages.findMany({
      where: eq(pages.workspaceId, alpha.workspaceId),
    });
    const alphaVersions = await ctx.db.query.pageVersions.findMany({
      where: eq(pageVersions.workspaceId, alpha.workspaceId),
    });

    expect(alphaProjects).toHaveLength(1);
    expect(alphaProjects[0].name).toBe("Projeto Alpha");
    expect(alphaPages.every((p) => p.name === "Página Alpha")).toBe(true);
    expect(alphaVersions.every((v) => v.workspaceId === alpha.workspaceId)).toBe(
      true,
    );

    // E o contrário também vale.
    const betaPages = await ctx.db.query.pages.findMany({
      where: eq(pages.workspaceId, beta.workspaceId),
    });
    expect(betaPages.every((p) => p.name === "Página Beta")).toBe(true);
  });

  it("leads de um workspace nunca aparecem na consulta do outro", async () => {
    const alphaLeads = await ctx.db.query.leads.findMany({
      where: eq(leads.workspaceId, alpha.workspaceId),
    });
    expect(alphaLeads).toHaveLength(1);
    expect((alphaLeads[0].data as { nome: string }).nome).toBe(
      "Cliente de Alpha",
    );
    expect(
      alphaLeads.some((l) =>
        JSON.stringify(l.data).includes("Beta"),
      ),
    ).toBe(false);
  });

  it("um lead NÃO pode ser lido cruzando workspace com id de página do outro", async () => {
    const betaPage = (
      await ctx.db.query.pages.findMany({
        where: eq(pages.workspaceId, beta.workspaceId),
      })
    )[0];

    // Simula o erro clássico: conhecer o id da página do outro e tentar ler
    // os leads dela dentro do escopo do próprio workspace.
    const cruzado = await ctx.db.query.leads.findMany({
      where: and(
        eq(leads.workspaceId, alpha.workspaceId),
        eq(leads.pageId, betaPage.id),
      ),
    });
    expect(cruzado).toHaveLength(0);
  });

  it("assets e eventos de analytics respeitam a fronteira", async () => {
    const alphaAssets = await ctx.db.query.assets.findMany({
      where: eq(assets.workspaceId, alpha.workspaceId),
    });
    const alphaEvents = await ctx.db.query.analyticsEvents.findMany({
      where: eq(analyticsEvents.workspaceId, alpha.workspaceId),
    });

    expect(alphaAssets).toHaveLength(1);
    expect(alphaAssets[0].storageKey).toContain(alpha.workspaceId);
    expect(alphaAssets[0].storageKey).not.toContain(beta.workspaceId);
    expect(alphaEvents).toHaveLength(1);
    expect(alphaEvents[0].eventKey).toBe("event-Alpha");
  });

  it("slug de página é único globalmente: um workspace não sequestra o endereço do outro", async () => {
    const betaPage = (
      await ctx.db.query.pages.findMany({
        where: eq(pages.workspaceId, beta.workspaceId),
      })
    )[0];

    // Alpha tenta publicar no mesmo endereço que Beta já ocupa.
    await expect(
      ctx.db.insert(pages).values({
        projectId: (
          await ctx.db.query.projects.findMany({
            where: eq(projects.workspaceId, alpha.workspaceId),
          })
        )[0].id,
        workspaceId: alpha.workspaceId,
        name: "Tentativa de sequestro",
        slug: betaPage.slug,
        status: "draft",
      }),
    ).rejects.toThrow();
  });
});

describe("isolamento financeiro entre workspaces", () => {
  it("créditos de um workspace não somam no saldo do outro", async () => {
    await grantCredits({
      workspaceId: alpha.workspaceId,
      amount: 500,
      source: "purchase",
    });

    expect((await getBalance(alpha.workspaceId)).available).toBe(500);
    // Beta continua zerado: nada vazou.
    expect((await getBalance(beta.workspaceId)).available).toBe(0);

    const betaLedger = await ctx.db.query.creditLedger.findMany({
      where: eq(creditLedger.workspaceId, beta.workspaceId),
    });
    expect(betaLedger).toHaveLength(0);
  });

  it("pagamento de um workspace concede plano SOMENTE a ele", async () => {
    const [order] = await ctx.db
      .insert(orders)
      .values({
        workspaceId: alpha.workspaceId,
        offerSnapshot: {
          planId: "start",
          periodMonths: 1,
          credits: 100,
          label: "Start mensal",
        },
        catalogVersion: CATALOG_VERSION,
        amountCents: 4900,
        provider: "stripe",
        idempotencyKey: "isolamento-1",
        status: "awaiting_payment",
        createdBy: alpha.profileId,
      })
      .returning();

    await applyPaymentEvent({
      provider: "stripe",
      eventId: "evt-isolamento",
      eventType: "checkout.session.completed",
      providerPaymentId: "pi-isolamento",
      orderId: order.id,
      status: "paid",
      amountCents: 4900,
    });

    expect((await getWorkspaceEntitlement(alpha.workspaceId)).plan.id).toBe(
      "start",
    );
    // Beta permanece no Free e sem créditos.
    expect((await getWorkspaceEntitlement(beta.workspaceId)).plan.id).toBe(
      "free",
    );
    expect((await getBalance(beta.workspaceId)).available).toBe(0);

    const betaGrants = await ctx.db.query.entitlementGrants.findMany({
      where: eq(entitlementGrants.workspaceId, beta.workspaceId),
    });
    expect(betaGrants).toHaveLength(0);
  });

  it("pedidos de um workspace não aparecem na cobrança do outro", async () => {
    await ctx.db.insert(orders).values({
      workspaceId: alpha.workspaceId,
      offerSnapshot: { planId: "pro", periodMonths: 1, credits: 0, label: "Pro" },
      catalogVersion: CATALOG_VERSION,
      amountCents: 12900,
      provider: "stripe",
      idempotencyKey: "isolamento-2",
      createdBy: alpha.profileId,
    });

    const betaOrders = await ctx.db.query.orders.findMany({
      where: eq(orders.workspaceId, beta.workspaceId),
    });
    expect(betaOrders).toHaveLength(0);
  });
});

describe("isolamento de convites", () => {
  it("convite pendente de um workspace não conta assento no outro", async () => {
    await ctx.db.insert(invitations).values({
      workspaceId: alpha.workspaceId,
      email: "convidado@exemplo.com.br",
      role: "editor",
      tokenHash: "hash-convite-alpha",
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      invitedBy: alpha.profileId,
    });

    const betaInvites = await ctx.db.query.invitations.findMany({
      where: eq(invitations.workspaceId, beta.workspaceId),
    });
    expect(betaInvites).toHaveLength(0);

    const alphaInvites = await ctx.db.query.invitations.findMany({
      where: eq(invitations.workspaceId, alpha.workspaceId),
    });
    expect(alphaInvites).toHaveLength(1);
  });
});
