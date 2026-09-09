import { NextResponse } from "next/server";
import { env } from "@/config/env";
import { drainJobs } from "@/server/jobs";
import { registerAllJobHandlers } from "@/server/jobs/handlers";

/**
 * Drain da fila durável. Em produção, chamado por cron autenticado
 * (JOB_DRAIN_TOKEN). Em dev, o drain também dispara in-process após cada
 * enqueue — este endpoint serve de reforço manual.
 */
export async function POST(request: Request) {
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
