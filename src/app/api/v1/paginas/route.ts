import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/features/api-keys/service";
import { getDb } from "@/server/db";
import { pages } from "@/server/db/schema";
import { clientIp, rateLimit } from "@/server/security/rate-limit";

import { publicPageUrl } from "@/features/pages/public-url";
/**
 * GET /api/v1/paginas — lista as páginas do workspace da chave.
 * Aplica o mesmo isolamento do app: nunca há como consultar outro workspace.
 */

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request, "pages:read");
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
  const rows = await db.query.pages.findMany({
    where: eq(pages.workspaceId, auth.workspaceId),
  });

  return NextResponse.json({
    data: rows.map((page) => ({
      id: page.id,
      nome: page.name,
      status: page.status,
      endereco:
        page.status === "live" && page.slug
          ? publicPageUrl(page.slug)
          : null,
      atualizadaEm: page.updatedAt.toISOString(),
    })),
  });
}
