"use server";

import { eq } from "drizzle-orm";
import { after } from "next/server";
import { z } from "zod";
import { env } from "@/config/env";
import { getCurrentUser } from "@/server/auth";
import { getDb } from "@/server/db";
import {
  contactMessages,
  professionalApplications,
  professionalProfiles,
} from "@/server/db/schema";
import { enqueueJob, kickDrain } from "@/server/jobs";
import { registerAllJobHandlers } from "@/server/jobs/handlers";
import { clientIp, rateLimit } from "@/server/security/rate-limit";
import { headers } from "next/headers";

/**
 * Marketplace (spec §15). Nesta versão o fluxo vai de candidatura até proposta.
 *
 * "Contratar e pagar" permanece BLOQUEADO com motivo (ver ./policy.ts):
 * pagamento intermediado exige provedor com split/custódia e onboarding de
 * recebedores, que não está configurado. A spec proíbe construir uma carteira
 * informal no banco.
 */

export interface FormResult {
  ok: boolean;
  error?: string;
  message?: string;
}

const applicationSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome.").max(120),
  email: z.string().trim().toLowerCase().email("Informe um e-mail válido."),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  specialty: z.string().trim().min(2, "Informe sua especialidade.").max(120),
  experience: z
    .string()
    .trim()
    .min(20, "Conte um pouco mais sobre sua experiência.")
    .max(2000),
  portfolioUrl: z
    .string()
    .trim()
    .url("Informe uma URL válida.")
    .startsWith("https://", "O link precisa começar com https://")
    .optional()
    .or(z.literal("")),
});

async function guardRate(bucket: string): Promise<boolean> {
  const headerList = await headers();
  const ip = clientIp(new Request("http://local", { headers: headerList }));
  return rateLimit(`${bucket}:${ip}`, 5, 60 * 60_000).allowed;
}

export async function submitApplicationAction(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  if (!(await guardRate("pro-application"))) {
    return { ok: false, error: "Muitos envios. Tente novamente mais tarde." };
  }

  const parsed = applicationSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") ?? "",
    specialty: formData.get("specialty"),
    experience: formData.get("experience"),
    portfolioUrl: formData.get("portfolioUrl") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const user = await getCurrentUser();
  const db = await getDb();

  await db.insert(professionalApplications).values({
    profileId: user?.profileId,
    name: parsed.data.name,
    email: parsed.data.email,
    phone: parsed.data.phone || null,
    specialty: parsed.data.specialty,
    experience: parsed.data.experience,
    portfolioUrl: parsed.data.portfolioUrl || null,
  });

  registerAllJobHandlers();
  await enqueueJob({
    type: "send_email",
    payload: {
      to: parsed.data.email,
      template: "candidatura-recebida",
      subject: "Recebemos sua candidatura — Decola",
      html:
        `<h2>Candidatura recebida</h2>` +
        `<p>Olá, ${parsed.data.name}. Recebemos sua candidatura para o marketplace de profissionais da Decola.</p>` +
        `<p>Toda candidatura passa por revisão manual antes de virar perfil público. Você recebe uma resposta por aqui.</p>`,
      dedupKey: `pro-application:${parsed.data.email}:${new Date().toISOString().slice(0, 10)}`,
    },
    dedupKey: `job-pro-application:${parsed.data.email}:${Date.now()}`,
  });
  after(() => kickDrain());

  return {
    ok: true,
    message:
      "Candidatura recebida. Ela passa por revisão manual antes de virar um perfil público — você recebe a resposta por e-mail.",
  };
}

const contactSchema = z.object({
  kind: z.enum(["contato", "agencia"]),
  name: z.string().trim().min(2, "Informe seu nome.").max(120),
  email: z.string().trim().toLowerCase().email("Informe um e-mail válido."),
  company: z.string().trim().max(120).optional().or(z.literal("")),
  message: z
    .string()
    .trim()
    .min(10, "Conte um pouco mais sobre o que você precisa.")
    .max(2000),
});

export async function submitContactAction(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  if (!(await guardRate("contact"))) {
    return { ok: false, error: "Muitos envios. Tente novamente mais tarde." };
  }

  const parsed = contactSchema.safeParse({
    kind: formData.get("kind") ?? "contato",
    name: formData.get("name"),
    email: formData.get("email"),
    company: formData.get("company") ?? "",
    message: formData.get("message"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const db = await getDb();
  await db.insert(contactMessages).values({
    kind: parsed.data.kind,
    name: parsed.data.name,
    email: parsed.data.email,
    company: parsed.data.company || null,
    message: parsed.data.message,
  });

  return {
    ok: true,
    message: env().capabilities.resendEmail
      ? "Mensagem recebida. Respondemos no e-mail informado."
      : "Mensagem recebida e registrada. Responderemos no e-mail informado assim que possível.",
  };
}

/** Catálogo público: apenas profissionais realmente aprovados e ativos. */
export async function listActiveProfessionals() {
  const db = await getDb();
  return db.query.professionalProfiles.findMany({
    where: eq(professionalProfiles.active, true),
    limit: 24,
  });
}
