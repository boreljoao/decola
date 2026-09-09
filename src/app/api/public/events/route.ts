import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/server/db";
import { analyticsEvents, pages } from "@/server/db/schema";
import { clientIp, rateLimit } from "@/server/security/rate-limit";

/**
 * Ingestão de eventos first-party (spec §13.1).
 * - Contrato fechado de tipos; sem texto de formulário, telefone ou e-mail.
 * - Sem cookies nem identificador persistente por padrão; sessionKey só chega
 *   se um mecanismo de consentimento explícito o habilitar.
 * - Dedup por eventKey; tráfego de preview nunca chega aqui (beacon desativado).
 */

const EVENT_TYPES = [
  "page_view",
  "cta_click",
  "whatsapp_click",
  "form_submit_success",
  "outbound_checkout_click",
  "booking_click",
  "download_success",
] as const;

const bodySchema = z.object({
  pageId: z.string().uuid(),
  pageVersionId: z.string().uuid().optional(),
  type: z.enum(EVENT_TYPES),
  eventKey: z.string().min(8).max(80),
  sessionKey: z.string().max(80).optional(),
  utm: z
    .object({
      source: z.string().max(100).optional(),
      medium: z.string().max(100).optional(),
      campaign: z.string().max(100).optional(),
    })
    .optional(),
});

export async function POST(request: Request) {
  const ip = clientIp(request);
  const rl = rateLimit(`events:${ip}`, 60, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  let parsed: z.infer<typeof bodySchema>;
  try {
    // navigator.sendBeacon envia strings como text/plain — o corpo é sempre
    // lido como texto e validado pelo schema, independentemente do content-type.
    const raw = await request.text();
    parsed = bodySchema.parse(JSON.parse(raw));
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // filtro simples de bots óbvios (spec §13.1)
  const ua = request.headers.get("user-agent") ?? "";
  if (/bot|crawler|spider|preview|headless/i.test(ua)) {
    return NextResponse.json({ ok: true });
  }

  const db = await getDb();
  const page = await db.query.pages.findFirst({
    where: eq(pages.id, parsed.pageId),
    columns: { id: true, workspaceId: true, status: true, publishedVersionId: true },
  });
  if (!page || page.status !== "live") {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  const referrer = request.headers.get("referer");
  let referrerHost: string | undefined;
  try {
    if (referrer) referrerHost = new URL(referrer).host.slice(0, 200);
  } catch {
    /* referer inválido é ignorado */
  }

  await db
    .insert(analyticsEvents)
    .values({
      workspaceId: page.workspaceId,
      pageId: page.id,
      pageVersionId: parsed.pageVersionId ?? page.publishedVersionId,
      type: parsed.type,
      eventKey: parsed.eventKey,
      sessionKey: parsed.sessionKey,
      utm: parsed.utm,
      referrerHost,
      day: new Date().toISOString().slice(0, 10),
    })
    .onConflictDoNothing({ target: analyticsEvents.eventKey });

  return NextResponse.json({ ok: true });
}
