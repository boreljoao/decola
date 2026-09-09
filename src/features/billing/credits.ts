import "server-only";
import { and, asc, eq, isNull, lt, or, sql } from "drizzle-orm";
import { getDb } from "@/server/db";
import {
  creditLedger,
  creditLots,
  creditReservations,
} from "@/server/db/schema";

/**
 * Combustível (spec §12.2). Invariantes:
 * - `available = granted - consumed - expired - reserved`, reconciliado por lotes.
 * - Reserva atômica ANTES do job pago; commit após entrega válida; liberação
 *   em falha elegível. O mesmo job nunca consome duas vezes (operationKey único).
 * - Ledger é append-only: correção entra como nova linha, nunca edição.
 * - Lotes que expiram antes são reservados primeiro.
 */

export const RESERVATION_TTL_MINUTES = 15;

export interface CreditBalance {
  granted: number;
  consumed: number;
  expired: number;
  reserved: number;
  available: number;
}

export async function getBalance(workspaceId: string): Promise<CreditBalance> {
  const db = await getDb();
  const now = new Date();

  const lots = await db.query.creditLots.findMany({
    where: eq(creditLots.workspaceId, workspaceId),
  });

  let granted = 0;
  let consumed = 0;
  let expired = 0;
  for (const lot of lots) {
    granted += lot.amount;
    consumed += lot.consumed;
    const isExpired = lot.expiresAt != null && lot.expiresAt <= now;
    if (isExpired) expired += lot.amount - lot.consumed;
  }

  const holds = await db.query.creditReservations.findMany({
    where: and(
      eq(creditReservations.workspaceId, workspaceId),
      eq(creditReservations.status, "held"),
    ),
  });
  const reserved = holds
    .filter((h) => h.expiresAt > now)
    .reduce((sum, h) => sum + h.amount, 0);

  return {
    granted,
    consumed,
    expired,
    reserved,
    available: Math.max(0, granted - consumed - expired - reserved),
  };
}

export type ReserveResult =
  | { ok: true; reservationId: string; alreadyHeld: boolean }
  | { ok: false; code: "insufficient"; available: number; needed: number };

/**
 * Reserva atômica. A unicidade de `operationKey` é a barreira contra consumo
 * duplo: duas chamadas concorrentes para a mesma operação resultam em uma
 * única reserva.
 */
export async function reserveCredits(input: {
  workspaceId: string;
  amount: number;
  operationKey: string;
}): Promise<ReserveResult> {
  const db = await getDb();

  return await db.transaction(async (tx) => {
    // Serializa reservas do MESMO workspace: sem isto, duas transações
    // concorrentes em READ COMMITTED leriam o mesmo saldo e reservariam em
    // excesso. O lock é liberado no fim da transação.
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtext(${input.workspaceId}))`,
    );

    // Reserva já existente para esta operação (retry do mesmo job).
    const existing = await tx.query.creditReservations.findFirst({
      where: eq(creditReservations.operationKey, input.operationKey),
    });
    if (existing) {
      if (existing.status === "held" && existing.expiresAt > new Date()) {
        return { ok: true, reservationId: existing.id, alreadyHeld: true };
      }
      if (existing.status === "committed") {
        // Já entregue e cobrado: não reserva de novo.
        return { ok: true, reservationId: existing.id, alreadyHeld: true };
      }
    }

    const balance = await getBalanceInTx(tx, input.workspaceId);
    if (balance.available < input.amount) {
      return {
        ok: false,
        code: "insufficient",
        available: balance.available,
        needed: input.amount,
      };
    }

    const [reservation] = await tx
      .insert(creditReservations)
      .values({
        workspaceId: input.workspaceId,
        amount: input.amount,
        operationKey: input.operationKey,
        status: "held",
        expiresAt: new Date(Date.now() + RESERVATION_TTL_MINUTES * 60_000),
      })
      .onConflictDoUpdate({
        target: creditReservations.operationKey,
        set: {
          status: "held",
          amount: input.amount,
          expiresAt: new Date(Date.now() + RESERVATION_TTL_MINUTES * 60_000),
        },
      })
      .returning();

    await tx.insert(creditLedger).values({
      workspaceId: input.workspaceId,
      kind: "reserve",
      amount: -input.amount,
      operationKey: input.operationKey,
      reason: "Reserva para operação paga",
    });

    return { ok: true, reservationId: reservation.id, alreadyHeld: false };
  });
}

type Tx = Parameters<Parameters<Awaited<ReturnType<typeof getDb>>["transaction"]>[0]>[0];

async function getBalanceInTx(
  tx: Tx,
  workspaceId: string,
): Promise<CreditBalance> {
  const now = new Date();
  const lots = await tx
    .select()
    .from(creditLots)
    .where(eq(creditLots.workspaceId, workspaceId));

  let granted = 0;
  let consumed = 0;
  let expired = 0;
  for (const lot of lots) {
    granted += lot.amount;
    consumed += lot.consumed;
    if (lot.expiresAt != null && lot.expiresAt <= now) {
      expired += lot.amount - lot.consumed;
    }
  }

  const holds = await tx
    .select()
    .from(creditReservations)
    .where(
      and(
        eq(creditReservations.workspaceId, workspaceId),
        eq(creditReservations.status, "held"),
      ),
    );
  const reserved = holds
    .filter((h) => h.expiresAt > now)
    .reduce((sum, h) => sum + h.amount, 0);

  return {
    granted,
    consumed,
    expired,
    reserved,
    available: Math.max(0, granted - consumed - expired - reserved),
  };
}

/**
 * Confirma o consumo após entrega válida. Debita dos lotes que expiram antes
 * (FEFO). Idempotente: commit repetido da mesma operação não cobra de novo.
 */
export async function commitCredits(operationKey: string): Promise<boolean> {
  const db = await getDb();

  return await db.transaction(async (tx) => {
    const reservation = await tx.query.creditReservations.findFirst({
      where: eq(creditReservations.operationKey, operationKey),
    });
    if (!reservation) return false;
    if (reservation.status === "committed") return true; // idempotente
    if (reservation.status !== "held") return false;

    const now = new Date();
    // FEFO: lotes com vencimento mais próximo primeiro; sem vencimento por último.
    const lots = await tx
      .select()
      .from(creditLots)
      .where(
        and(
          eq(creditLots.workspaceId, reservation.workspaceId),
          sql`${creditLots.consumed} < ${creditLots.amount}`,
          or(isNull(creditLots.expiresAt), sql`${creditLots.expiresAt} > ${now}`),
        ),
      )
      // Lote sem vencimento fica por último (NULLS LAST precede a direção).
      .orderBy(
        sql`${creditLots.expiresAt} ASC NULLS LAST`,
        asc(creditLots.createdAt),
      );

    let remaining = reservation.amount;
    for (const lot of lots) {
      if (remaining <= 0) break;
      const room = lot.amount - lot.consumed;
      const take = Math.min(room, remaining);
      await tx
        .update(creditLots)
        .set({ consumed: lot.consumed + take })
        .where(eq(creditLots.id, lot.id));
      await tx.insert(creditLedger).values({
        workspaceId: reservation.workspaceId,
        kind: "commit",
        amount: -take,
        lotId: lot.id,
        operationKey: `${operationKey}:${lot.id}`,
        reason: "Consumo confirmado após entrega",
      });
      remaining -= take;
    }

    await tx
      .update(creditReservations)
      .set({ status: "committed" })
      .where(eq(creditReservations.id, reservation.id));

    return remaining === 0;
  });
}

/** Libera a reserva (falha do motor, cancelamento elegível). Sem cobrança. */
export async function releaseCredits(operationKey: string): Promise<boolean> {
  const db = await getDb();
  return await db.transaction(async (tx) => {
    const reservation = await tx.query.creditReservations.findFirst({
      where: eq(creditReservations.operationKey, operationKey),
    });
    if (!reservation || reservation.status !== "held") return false;

    await tx
      .update(creditReservations)
      .set({ status: "released" })
      .where(eq(creditReservations.id, reservation.id));

    await tx.insert(creditLedger).values({
      workspaceId: reservation.workspaceId,
      kind: "release",
      amount: reservation.amount,
      operationKey: `release:${operationKey}`,
      reason: "Reserva liberada sem cobrança",
    });
    return true;
  });
}

/** Concede um lote. `periodKey` garante recarga mensal única por período. */
export async function grantCredits(input: {
  workspaceId: string;
  amount: number;
  source: "trial" | "subscription" | "purchase" | "bonus";
  expiresAt?: Date | null;
  orderId?: string;
  periodKey?: string;
  reason?: string;
}): Promise<{ granted: boolean; lotId?: string }> {
  const db = await getDb();
  const inserted = await db
    .insert(creditLots)
    .values({
      workspaceId: input.workspaceId,
      amount: input.amount,
      source: input.source,
      expiresAt: input.expiresAt ?? null,
      orderId: input.orderId,
      periodKey: input.periodKey ?? null,
    })
    .onConflictDoNothing({
      target: [creditLots.workspaceId, creditLots.source, creditLots.periodKey],
    })
    .returning({ id: creditLots.id });

  if (inserted.length === 0) return { granted: false };

  await db.insert(creditLedger).values({
    workspaceId: input.workspaceId,
    kind: "grant",
    amount: input.amount,
    lotId: inserted[0].id,
    operationKey: `grant:${inserted[0].id}`,
    reason: input.reason ?? `Concessão (${input.source})`,
  });
  return { granted: true, lotId: inserted[0].id };
}

/** Expira reservas vencidas — chamado pelo worker. Não cobra nada. */
export async function expireStaleReservations(): Promise<number> {
  const db = await getDb();
  const stale = await db
    .update(creditReservations)
    .set({ status: "expired" })
    .where(
      and(
        eq(creditReservations.status, "held"),
        lt(creditReservations.expiresAt, new Date()),
      ),
    )
    .returning({ id: creditReservations.id, workspaceId: creditReservations.workspaceId, amount: creditReservations.amount, operationKey: creditReservations.operationKey });

  for (const r of stale) {
    await db
      .insert(creditLedger)
      .values({
        workspaceId: r.workspaceId,
        kind: "release",
        amount: r.amount,
        operationKey: `expire:${r.operationKey}`,
        reason: "Reserva expirada sem entrega",
      })
      .onConflictDoNothing();
  }
  return stale.length;
}
