import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/server/db";
import { jobs } from "@/server/db/schema";

/**
 * JobProvider durável sobre Postgres (decisão D-005):
 * - jobs persistem em tabela (sobrevivem a restart);
 * - lease com `locked_until` + reclaim de jobs órfãos;
 * - retry exponencial com jitter; dedup por chave única; agendamento por `run_at`.
 * Execução: drain in-process após enfileirar (dev) e endpoint de drain + cron (prod).
 */

export interface EnqueueInput {
  type: string;
  payload: Record<string, unknown>;
  dedupKey?: string;
  runAt?: Date;
  maxAttempts?: number;
}

export interface EnqueueResult {
  jobId: string;
  deduplicated: boolean;
}

export type JobHandler = (payload: Record<string, unknown>) => Promise<void>;

const handlers = new Map<string, JobHandler>();

export function registerJobHandler(type: string, handler: JobHandler): void {
  handlers.set(type, handler);
}

export async function enqueueJob(input: EnqueueInput): Promise<EnqueueResult> {
  const db = await getDb();

  if (input.dedupKey) {
    const inserted = await db
      .insert(jobs)
      .values({
        type: input.type,
        payload: input.payload,
        dedupKey: input.dedupKey,
        runAt: input.runAt ?? new Date(),
        maxAttempts: input.maxAttempts ?? 5,
      })
      .onConflictDoNothing({ target: jobs.dedupKey })
      .returning({ id: jobs.id });
    if (inserted.length === 0) {
      const existing = await db.query.jobs.findFirst({
        where: eq(jobs.dedupKey, input.dedupKey),
        columns: { id: true },
      });
      return { jobId: existing!.id, deduplicated: true };
    }
    return { jobId: inserted[0].id, deduplicated: false };
  }

  const [row] = await db
    .insert(jobs)
    .values({
      type: input.type,
      payload: input.payload,
      runAt: input.runAt ?? new Date(),
      maxAttempts: input.maxAttempts ?? 5,
    })
    .returning({ id: jobs.id });
  return { jobId: row.id, deduplicated: false };
}

export async function cancelJob(jobId: string): Promise<boolean> {
  const db = await getDb();
  const updated = await db
    .update(jobs)
    .set({ status: "canceled", updatedAt: new Date() })
    .where(and(eq(jobs.id, jobId), eq(jobs.status, "pending")))
    .returning({ id: jobs.id });
  return updated.length > 0;
}

const LEASE_SECONDS = 120;

interface ClaimedJob {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  attempts: number;
  max_attempts: number;
}

async function claimNext(workerId: string): Promise<ClaimedJob | null> {
  const db = await getDb();
  // Reivindica o próximo job elegível: pendente e no horário, ou órfão
  // (running com lease vencida). FOR UPDATE SKIP LOCKED evita corrida entre workers.
  const result = await db.execute(sql`
    UPDATE jobs SET
      status = 'running',
      attempts = attempts + 1,
      locked_by = ${workerId},
      locked_until = now() + interval '${sql.raw(String(LEASE_SECONDS))} seconds',
      updated_at = now()
    WHERE id = (
      SELECT id FROM jobs
      WHERE (status = 'pending' AND run_at <= now())
         OR (status = 'running' AND locked_until < now())
      ORDER BY run_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id, type, payload, attempts, max_attempts
  `);
  const rows = result as unknown as { rows?: ClaimedJob[] };
  const list = Array.isArray(result)
    ? (result as unknown as ClaimedJob[])
    : (rows.rows ?? []);
  return list[0] ?? null;
}

function backoffMs(attempt: number): number {
  const base = Math.min(60_000 * 2 ** (attempt - 1), 15 * 60_000);
  return Math.round(base / 2 + Math.random() * base);
}

export interface DrainResult {
  processed: number;
  failed: number;
}

/** Processa até `max` jobs. Seguro para chamadas concorrentes. */
export async function drainJobs(max = 10): Promise<DrainResult> {
  const workerId = `worker-${process.pid}-${crypto.randomUUID().slice(0, 8)}`;
  const db = await getDb();
  let processed = 0;
  let failed = 0;

  for (let i = 0; i < max; i++) {
    const job = await claimNext(workerId);
    if (!job) break;

    const handler = handlers.get(job.type);
    try {
      if (!handler) {
        throw new Error(`Nenhum handler registrado para o tipo "${job.type}".`);
      }
      await handler(job.payload);
      await db
        .update(jobs)
        .set({
          status: "completed",
          completedAt: new Date(),
          updatedAt: new Date(),
          lockedUntil: null,
          lockedBy: null,
        })
        .where(eq(jobs.id, job.id));
      processed++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const exhausted = job.attempts >= job.max_attempts;
      await db
        .update(jobs)
        .set({
          status: exhausted ? "failed" : "pending",
          runAt: exhausted
            ? undefined
            : new Date(Date.now() + backoffMs(job.attempts)),
          lastError: message.slice(0, 2000),
          lockedUntil: null,
          lockedBy: null,
          updatedAt: new Date(),
        })
        .where(eq(jobs.id, job.id));
      failed++;
      console.error(`[decola:jobs] job ${job.id} (${job.type}) falhou:`, message);
    }
  }

  return { processed, failed };
}

/** Dispara um drain fora do caminho da resposta (dev/in-process). */
export function kickDrain(): void {
  void drainJobs().catch((err) =>
    console.error("[decola:jobs] drain falhou:", err),
  );
}
