import { NextResponse } from "next/server";
import { env } from "@/config/env";
import { drainJobs } from "@/server/jobs";
import { registerAllJobHandlers } from "@/server/jobs/handlers";

/**
 * Drain da fila durável.
 *
 * O caminho normal em produção não depende deste endpoint: cada enfileiramento
 * dispara `after(() => kickDrain())` na mesma requisição. Aqui é a rede de
 * segurança — retentativas com backoff e jobs agendados para o futuro, que
 * ninguém mais acordaria.
 *
 * Autorização em produção: `Authorization: Bearer <JOB_DRAIN_TOKEN>`. O cron da
 * Vercel chama por GET e envia `Bearer <CRON_SECRET>`; por isso as duas
 * variáveis precisam ter o mesmo valor (docs/deploy.md).
 */

async function handle(request: Request) {
  const e = env();
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (e.mode === "production") {
    if (!e.JOB_DRAIN_TOKEN || token !== e.JOB_DRAIN_TOKEN) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }

  registerAllJobHandlers();
  const result = await drainJobs(25);
  return NextResponse.json({ ok: true, ...result });
}

export async function POST(request: Request) {
  return handle(request);
}

/** Ponto de entrada do cron agendado (a Vercel invoca crons por GET). */
export async function GET(request: Request) {
  return handle(request);
}
