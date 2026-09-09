import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/server/db/schema";

/**
 * Banco efêmero em memória para testes de invariante. Usa as MESMAS migrations
 * da aplicação, então o schema testado é o schema real.
 *
 * `getDb()` resolve a conexão a partir de `globalThis.__decolaDb`; injetamos
 * o banco de teste ali antes de os módulos serem exercitados.
 */
export async function setupTestDb() {
  const client = new PGlite(); // sem dataDir = memória
  const db = drizzle(client, { schema });
  await migrate(db, {
    migrationsFolder: path.join(process.cwd(), "drizzle"),
  });

  (globalThis as { __decolaDb?: Promise<unknown> }).__decolaDb =
    Promise.resolve(db);

  return {
    db,
    async close() {
      delete (globalThis as { __decolaDb?: Promise<unknown> }).__decolaDb;
      await client.close();
    },
  };
}

/** Cria profile + workspace mínimos para exercitar regras de negócio. */
export async function seedWorkspace(
  db: Awaited<ReturnType<typeof setupTestDb>>["db"],
  suffix = "1",
) {
  const [profile] = await db
    .insert(schema.profiles)
    .values({ email: `teste-${suffix}@decola.local`, displayName: "Teste" })
    .returning();
  const [workspace] = await db
    .insert(schema.workspaces)
    .values({
      name: `Workspace ${suffix}`,
      slug: `workspace-${suffix}`,
      createdBy: profile.id,
    })
    .returning();
  await db.insert(schema.memberships).values({
    workspaceId: workspace.id,
    profileId: profile.id,
    role: "owner",
  });
  return { profile, workspace };
}
