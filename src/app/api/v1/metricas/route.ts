import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/features/api-keys/service";
import { getDb } from "@/server/db";
import { analyticsEvents, leads, pages } from "@/server/db/schema";
import { clientIp, rateLimit } from "@/server/security/rate-limit";

/**
 * GET /api/v1/metricas — métricas AGREGADAS por página.
 * Nunca devolve dados de visitante individual nem conteúdo de formulário.
 */

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request, "metrics:read");
  if (!auth.ok) {
    return NextResponse.json(
      { error: { code: auth.code, message: auth.message } },
      { status: auth.status },
    );
  }

  const limit = rateLimit(`api:${auth.workspaceId}:${clientIp(request)}`, 120, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: { code: "rate_limited", message: "Limite de requisições atingido." } },
      { status: 429 },
    );
  }

  const db = await getDb();
  const pageRows = await db.query.pages.findMany({
    where: eq(pages.workspaceId, auth.workspaceId),
    columns: { id: true, name: true },
  });

  const data = [];
  for (const page of pageRows) {
    const events = await db.query.analyticsEvents.findMany({
      where: eq(analyticsEvents.pageId, page.id),
      columns: { type: true },
    });
    const leadRows = await db.query.leads.findMany({
      where: and(
        eq(leads.pageId, page.id),
        eq(leads.workspaceId, auth.workspaceId),
      ),
      columns: { id: true },
    });
    const count = (type: string) => events.filter((e) => e.type === type).length;
    const visitas = count("page_view");
    const conversoes = count("whatsapp_click") + count("form_submit_success");

    data.push({
      paginaId: page.id,
      nome: page.name,
      visitas,
      cliquesCta: count("cta_click"),
      cliquesWhatsapp: count("whatsapp_click"),
      leads: leadRows.length,
      // Denominador explícito: a taxa não existe sem visitas.
      taxaConversaoPct:
        visitas > 0 ? Number(((conversoes / visitas) * 100).toFixed(1)) : null,
      denominador: visitas,
    });
  }

  return NextResponse.json({ data });
}
