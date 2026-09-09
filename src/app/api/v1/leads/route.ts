import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateApiRequest } from "@/features/api-keys/service";
import { getDb } from "@/server/db";
import { leads, pages } from "@/server/db/schema";
import { clientIp, rateLimit } from "@/server/security/rate-limit";

/**
 * GET  /api/v1/leads — lista contatos do workspace.
 * POST /api/v1/leads — cria um contato (integração externa).
 * A fronteira de workspace vale igual ao app: um id de página de outro
 * workspace simplesmente não é encontrado.
 */

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request, "leads:read");
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

  const url = new URL(request.url);
  const pageId = url.searchParams.get("paginaId");
  const take = Math.min(Number(url.searchParams.get("limite") ?? 50), 200);

  const db = await getDb();
  const rows = await db.query.leads.findMany({
    where: pageId
      ? and(eq(leads.workspaceId, auth.workspaceId), eq(leads.pageId, pageId))
      : eq(leads.workspaceId, auth.workspaceId),
    orderBy: [desc(leads.createdAt)],
    limit: take,
  });

  return NextResponse.json({
    data: rows.map((lead) => ({
      id: lead.id,
      paginaId: lead.pageId,
      dados: lead.data,
      status: lead.status,
      recebidoEm: lead.createdAt.toISOString(),
    })),
  });
}

const createSchema = z.object({
  paginaId: z.string().uuid(),
  dados: z.object({
    nome: z.string().trim().min(1).max(120).optional(),
    email: z.string().trim().email().max(200).optional(),
    telefone: z.string().trim().min(8).max(30).optional(),
    mensagem: z.string().trim().max(2000).optional(),
  }),
  /** Chave de idempotência do integrador. */
  chaveExterna: z.string().trim().min(4).max(120).optional(),
});

export async function POST(request: Request) {
  const auth = await authenticateApiRequest(request, "leads:write");
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

  let body: z.infer<typeof createSchema>;
  try {
    body = createSchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      { error: { code: "invalid_body", message: "Corpo inválido." } },
      { status: 400 },
    );
  }

  const db = await getDb();
  // A página precisa ser DO workspace da chave.
  const page = await db.query.pages.findFirst({
    where: and(
      eq(pages.id, body.paginaId),
      eq(pages.workspaceId, auth.workspaceId),
    ),
  });
  if (!page) {
    return NextResponse.json(
      { error: { code: "page_not_found", message: "Página não encontrada." } },
      { status: 404 },
    );
  }

  const inserted = await db
    .insert(leads)
    .values({
      workspaceId: auth.workspaceId,
      pageId: page.id,
      data: body.dados,
      dedupKey: body.chaveExterna ? `api:${auth.workspaceId}:${body.chaveExterna}` : null,
    })
    .onConflictDoNothing({ target: leads.dedupKey })
    .returning({ id: leads.id });

  if (inserted.length === 0) {
    return NextResponse.json({ data: { duplicado: true } }, { status: 200 });
  }
  return NextResponse.json({ data: { id: inserted[0].id } }, { status: 201 });
}
