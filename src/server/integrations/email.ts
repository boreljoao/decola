import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { env } from "@/config/env";
import { getDb } from "@/server/db";
import { emailDeliveries } from "@/server/db/schema";

/**
 * EmailProvider (decisão D-010): renderizar/enviar, deduplicar e tratar resultado.
 * - Resend configurado → envio real.
 * - dev/test/demo sem Resend → transporte de arquivo (.data/outbox-emails),
 *   status `dev_written`, inspecionável. Nunca finge envio real.
 */

export interface EmailMessage {
  to: string;
  template: string;
  subject: string;
  html: string;
  workspaceId?: string;
  /** Evita reenvio do mesmo e-mail lógico (ex.: lead notificado 2x). */
  dedupKey?: string;
}

export type EmailResult =
  | { ok: true; status: "sent" | "dev_written" | "deduplicated" }
  | { ok: false; error: string };

export async function sendEmail(message: EmailMessage): Promise<EmailResult> {
  const db = await getDb();
  const e = env();

  const inserted = await db
    .insert(emailDeliveries)
    .values({
      toEmail: message.to,
      template: message.template,
      subject: message.subject,
      workspaceId: message.workspaceId,
      dedupKey: message.dedupKey,
      payload: { htmlLength: message.html.length },
      status: "queued",
    })
    .onConflictDoNothing({ target: emailDeliveries.dedupKey })
    .returning({ id: emailDeliveries.id });

  if (inserted.length === 0 && message.dedupKey) {
    return { ok: true, status: "deduplicated" };
  }
  const deliveryId = inserted[0].id;

  if (e.capabilities.resendEmail) {
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(e.RESEND_API_KEY);
      const { error } = await resend.emails.send({
        from: e.EMAIL_FROM!,
        to: message.to,
        subject: message.subject,
        html: message.html,
      });
      if (error) throw new Error(error.message);
      await db
        .update(emailDeliveries)
        .set({ status: "sent", sentAt: new Date() })
        .where(eq(emailDeliveries.id, deliveryId));
      return { ok: true, status: "sent" };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await db
        .update(emailDeliveries)
        .set({ status: "failed", error: msg.slice(0, 1000) })
        .where(eq(emailDeliveries.id, deliveryId));
      return { ok: false, error: msg };
    }
  }

  if (e.mode === "production") {
    const msg = "EmailProvider não configurado (RESEND_API_KEY/EMAIL_FROM).";
    await db
      .update(emailDeliveries)
      .set({ status: "failed", error: msg })
      .where(eq(emailDeliveries.id, deliveryId));
    return { ok: false, error: msg };
  }

  // Transporte de desenvolvimento: grava o e-mail em disco.
  const dir = path.join(process.cwd(), ".data", e.LOCAL_EMAIL_OUTBOX_DIR);
  await mkdir(dir, { recursive: true });
  const file = path.join(
    dir,
    `${new Date().toISOString().replace(/[:.]/g, "-")}-${message.template}.html`,
  );
  await writeFile(
    file,
    `<!-- para: ${message.to} | assunto: ${message.subject} | template: ${message.template} -->\n${message.html}`,
    "utf8",
  );
  await db
    .update(emailDeliveries)
    .set({ status: "dev_written", sentAt: new Date() })
    .where(eq(emailDeliveries.id, deliveryId));
  return { ok: true, status: "dev_written" };
}
