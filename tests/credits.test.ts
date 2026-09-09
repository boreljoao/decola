import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  commitCredits,
  getBalance,
  grantCredits,
  releaseCredits,
  reserveCredits,
} from "@/features/billing/credits";
import { creditLedger, creditLots } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { seedWorkspace, setupTestDb } from "./helpers/test-db";

/**
 * Invariantes de crédito (spec §19.1, item 3): dois consumos concorrentes não
 * gastam o mesmo saldo; falha e retry não cobram duas vezes.
 */

let ctx: Awaited<ReturnType<typeof setupTestDb>>;
let workspaceId: string;

beforeEach(async () => {
  ctx = await setupTestDb();
  const seeded = await seedWorkspace(ctx.db);
  workspaceId = seeded.workspace.id;
});

afterEach(async () => {
  await ctx.close();
});

describe("saldo de créditos", () => {
  it("available = granted - consumed - expired - reserved", async () => {
    await grantCredits({ workspaceId, amount: 100, source: "subscription" });
    expect((await getBalance(workspaceId)).available).toBe(100);

    await reserveCredits({ workspaceId, amount: 30, operationKey: "op-a" });
    const afterReserve = await getBalance(workspaceId);
    expect(afterReserve.reserved).toBe(30);
    expect(afterReserve.available).toBe(70);

    await commitCredits("op-a");
    const afterCommit = await getBalance(workspaceId);
    expect(afterCommit.consumed).toBe(30);
    expect(afterCommit.reserved).toBe(0);
    expect(afterCommit.available).toBe(70);
  });

  it("lote expirado sai do saldo disponível", async () => {
    await grantCredits({
      workspaceId,
      amount: 50,
      source: "subscription",
      expiresAt: new Date(Date.now() - 1000),
    });
    await grantCredits({ workspaceId, amount: 20, source: "purchase" });
    const balance = await getBalance(workspaceId);
    expect(balance.expired).toBe(50);
    expect(balance.available).toBe(20);
  });
});

describe("concorrência e idempotência", () => {
  it("dois consumos concorrentes não gastam o mesmo saldo", async () => {
    await grantCredits({ workspaceId, amount: 10, source: "subscription" });

    const [a, b] = await Promise.all([
      reserveCredits({ workspaceId, amount: 8, operationKey: "job-1" }),
      reserveCredits({ workspaceId, amount: 8, operationKey: "job-2" }),
    ]);

    const succeeded = [a, b].filter((r) => r.ok);
    const failed = [a, b].filter((r) => !r.ok);
    expect(succeeded).toHaveLength(1);
    expect(failed).toHaveLength(1);
    if (!failed[0].ok) expect(failed[0].code).toBe("insufficient");

    const balance = await getBalance(workspaceId);
    expect(balance.reserved).toBe(8);
    expect(balance.available).toBe(2);
  });

  it("retry do MESMO job reutiliza a reserva e não cobra duas vezes", async () => {
    await grantCredits({ workspaceId, amount: 100, source: "subscription" });

    const first = await reserveCredits({
      workspaceId,
      amount: 25,
      operationKey: "job-retry",
    });
    const second = await reserveCredits({
      workspaceId,
      amount: 25,
      operationKey: "job-retry",
    });
    expect(first.ok && second.ok).toBe(true);
    if (second.ok) expect(second.alreadyHeld).toBe(true);

    expect((await getBalance(workspaceId)).reserved).toBe(25);

    // commit repetido também é idempotente
    await commitCredits("job-retry");
    await commitCredits("job-retry");
    const balance = await getBalance(workspaceId);
    expect(balance.consumed).toBe(25);
    expect(balance.available).toBe(75);
  });

  it("falha do motor libera a reserva sem cobrar", async () => {
    await grantCredits({ workspaceId, amount: 40, source: "subscription" });
    await reserveCredits({ workspaceId, amount: 15, operationKey: "job-falha" });
    expect((await getBalance(workspaceId)).available).toBe(25);

    await releaseCredits("job-falha");
    const balance = await getBalance(workspaceId);
    expect(balance.consumed).toBe(0);
    expect(balance.reserved).toBe(0);
    expect(balance.available).toBe(40);
  });

  it("recusa reserva sem saldo suficiente", async () => {
    await grantCredits({ workspaceId, amount: 5, source: "trial" });
    const result = await reserveCredits({
      workspaceId,
      amount: 10,
      operationKey: "job-caro",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.available).toBe(5);
      expect(result.needed).toBe(10);
    }
  });
});

describe("regras de lote e ledger", () => {
  it("consome primeiro o lote que expira antes (FEFO)", async () => {
    const later = await grantCredits({
      workspaceId,
      amount: 10,
      source: "purchase", // sem expiração
    });
    const sooner = await grantCredits({
      workspaceId,
      amount: 10,
      source: "subscription",
      expiresAt: new Date(Date.now() + 60_000),
    });

    await reserveCredits({ workspaceId, amount: 10, operationKey: "op-fefo" });
    await commitCredits("op-fefo");

    const lots = await ctx.db.query.creditLots.findMany({
      where: eq(creditLots.workspaceId, workspaceId),
    });
    const soonerLot = lots.find((l) => l.id === sooner.lotId);
    const laterLot = lots.find((l) => l.id === later.lotId);
    expect(soonerLot?.consumed).toBe(10);
    expect(laterLot?.consumed).toBe(0);
  });

  it("recarga do mesmo período não concede duas vezes", async () => {
    const first = await grantCredits({
      workspaceId,
      amount: 100,
      source: "subscription",
      periodKey: "2026-09",
    });
    const duplicate = await grantCredits({
      workspaceId,
      amount: 100,
      source: "subscription",
      periodKey: "2026-09",
    });
    expect(first.granted).toBe(true);
    expect(duplicate.granted).toBe(false);
    expect((await getBalance(workspaceId)).granted).toBe(100);
  });

  it("ledger é append-only e registra cada movimento", async () => {
    await grantCredits({ workspaceId, amount: 20, source: "trial" });
    await reserveCredits({ workspaceId, amount: 5, operationKey: "op-ledger" });
    await commitCredits("op-ledger");

    const entries = await ctx.db.query.creditLedger.findMany({
      where: eq(creditLedger.workspaceId, workspaceId),
    });
    const kinds = entries.map((e) => e.kind);
    expect(kinds).toContain("grant");
    expect(kinds).toContain("reserve");
    expect(kinds).toContain("commit");
    // soma do ledger reflete o saldo: +20 (grant) -5 (reserve) -5 (commit)
    const sum = entries.reduce((acc, e) => acc + e.amount, 0);
    expect(sum).toBe(10);
  });
});
