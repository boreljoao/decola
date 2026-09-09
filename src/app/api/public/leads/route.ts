import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { after } from "next/server";
import { z } from "zod";
import { env } from "@/config/env";
import { getDb } from "@/server/db";
import {
  analyticsEvents,
  leads,
  memberships,
  pages,
  profiles,
} from "@/server/db/schema";
import { enqueueJob, kickDrain } from "@/server/jobs";
import { registerAllJobHandlers } from "@/server/jobs/handlers";
import { clientIp, rateLimit } from "@/server/security/rate-limit";

/**
 * Captura de lead (spec §11.3): validação server-side, antispam, persistência
 * privada, dedup de submissão e notificação via fila. O lead é persistido
 * ANTES de qualquer integração; e-mail é assíncrono e recuperável.
 */

const bodySchema = z.object({
  pageId: z.string().uuid(),
  pageVersionId: z.string().uuid().optional(),
  submissionKey: z.string().uuid(),
  website: z.string().max(200).optional(), // honeypot
  data: z
    .object({
      nome: z.string().trim().min(1).max(120).optional(),
      email: z.string().trim().email().max(200).optional(),
      telefone: z.string().trim().min(8).max(30).optional(),
      mensagem: z.string().trim().max(2000).optional(),
    })
    .refine((d) => Object.values(d).some((v) => v && String(v).length > 0), {
      message: "Preencha ao menos um campo.",
    }),
});

export async function POST(request: Request) {
  const ip = clientIp(request);
  const rl = rateLimit(`leads:${ip}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, message: "Muitas tentativas. Aguarde um instante." },
      { status: 429 },
    );
  }

  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      { ok: false, message: "Dados inválidos." },
      { status: 400 },
    );
  }

  // honeypot preenchido → responde ok sem persistir (não educa o bot)
  if (parsed.website && parsed.website.length > 0) {
    return NextResponse.json({ ok: true });
  }

  const db = await getDb();
  const page = await db.query.pages.findFirst({
    where: eq(pages.id, parsed.pageId),
  });
  if (!page || page.status !== "live") {
    return NextResponse.json(
      { ok: false, message: "Página indisponível." },
      { status: 404 },
    );
  }

  const inserted = await db
    .insert(leads)
    .values({
      workspaceId: page.workspaceId,
      pageId: page.id,
      pageVersionId: parsed.pageVersionId ?? page.publishedVersionId,
      data: parsed.data,
      dedupKey: `lead:${parsed.submissionKey}`,
    })
    .onConflictDoNothing({ target: leads.dedupKey })
    .returning({ id: leads.id });

  if (inserted.length > 0) {
    // evento de conversão first-party (sem dados do formulário — spec §13.1)
    await db
      .insert(analyticsEvents)
      .values({
        workspaceId: page.workspaceId,
        pageId: page.id,
        pageVersionId: parsed.pageVersionId ?? page.publishedVersionId,
        type: "form_submit_success",
        eventKey: `lead-event:${parsed.submissionKey}`,
        day: new Date().toISOString().slice(0, 10),
      })
      .onConflictDoNothing({ target: analyticsEvents.eventKey });

    // notificação ao owner via fila (outbox)
    const owner = await db
      .select({ email: profiles.email })
      .from(memberships)
      .innerJoin(profiles, eq(memberships.profileId, profiles.id))
      .where(eq(memberships.workspaceId, page.workspaceId))
      .limit(1);

    if (owner[0]) {
      registerAllJobHandlers();
      const appUrl = env().APP_URL;
      await enqueueJob({
        type: "send_email",
        payload: {
          to: owner[0].email,
          template: "novo-lead",
          subject: `Novo contato na página ${page.name}`,
          html:
            `<h2>Você recebeu um novo contato</h2>` +
            `<p>Sua página <strong>${page.name}</strong> gerou um novo lead.</p>` +
            `<p><a href="${appUrl}/app/paginas/${page.projectId}/leads">Ver leads no painel Decola</a></p>`,
          workspaceId: page.workspaceId,
          dedupKey: `email-lead:${parsed.submissionKey}`,
        },
        dedupKey: `job-email-lead:${parsed.submissionKey}`,
      });
      after(() => kickDrain());
    }
  }

  return NextResponse.json({ ok: true });
}
