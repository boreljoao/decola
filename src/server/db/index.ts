import "server-only";
import path from "node:path";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePg } from "drizzle-orm/postgres-js/migrator";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { env } from "@/config/env";
import * as schema from "./schema";

export { schema };

/**
 * Factory única de conexão (decisão D-003):
 * - `DATABASE_URL` presente → Postgres real (Supabase) via postgres-js.
 * - ausente e fora de produção → PGlite (Postgres embarcado em `.data/pglite`).
 * - ausente em produção → erro de boot (validado em env()).
 */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

const MIGRATIONS_FOLDER = path.join(process.cwd(), "drizzle");

type DbGlobal = {
  __decolaDb?: Promise<Db>;
};

async function createDb(): Promise<Db> {
  const e = env();

  if (e.DATABASE_URL) {
    const { default: postgres } = await import("postgres");
    const client = postgres(e.DATABASE_URL, { prepare: false, max: 5 });
    const db = drizzlePg(client, { schema });
    if (e.mode !== "production") {
      // Em produção, migrations rodam por script de deploy (npm run db:migrate).
      await migratePg(db, { migrationsFolder: MIGRATIONS_FOLDER });
    }
    return db as unknown as Db;
  }

  const { PGlite } = await import("@electric-sql/pglite");
  const { mkdir } = await import("node:fs/promises");
  const dataDir = path.join(process.cwd(), ".data", e.PGLITE_DIR);
  await mkdir(dataDir, { recursive: true });
  const client = new PGlite(dataDir);
  const db = drizzlePglite(client, { schema });
  await migratePglite(db, { migrationsFolder: MIGRATIONS_FOLDER });
  console.info(
    `[decola:db] usando PGlite local em ${dataDir} (modo ${e.mode}). ` +
      "Defina DATABASE_URL para usar Postgres/Supabase.",
  );
  return db as unknown as Db;
}

export function getDb(): Promise<Db> {
  const g = globalThis as DbGlobal;
  if (!g.__decolaDb) {
    g.__decolaDb = createDb().catch((err) => {
      // Falha de conexão/migração não fica cacheada: a próxima chamada tenta de novo.
      g.__decolaDb = undefined;
      throw err;
    });
  }
  return g.__decolaDb;
}
