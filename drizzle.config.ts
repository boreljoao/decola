import { readFileSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

/**
 * O drizzle-kit roda fora do Next e por isso não herda o carregamento
 * automático de `.env.local` / `.env`. Lemos o arquivo aqui para que
 * `npm run db:migrate` funcione com a connection string existindo **apenas no
 * arquivo local** — que o `.gitignore` já exclui. A alternativa (exportar a
 * variável na linha de comando) deixaria a senha do banco no histórico do
 * shell.
 */
function readDatabaseUrl(): string | undefined {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  for (const file of [".env.local", ".env"]) {
    let content: string;
    try {
      content = readFileSync(file, "utf8");
    } catch {
      continue; // arquivo ausente é o caso normal em dev (PGlite embarcado)
    }
    for (const line of content.split(/\r?\n/)) {
      const match = /^\s*(?:export\s+)?DATABASE_URL\s*=\s*(.*)$/.exec(line);
      if (!match) continue;
      const value = match[1].trim().replace(/^["']/, "").replace(/["']$/, "");
      if (value) return value;
    }
  }
  return undefined;
}

const url = readDatabaseUrl();

// `generate` funciona offline e não precisa de banco; `migrate`/`push`/`studio`
// precisam. Sem esta checagem o drizzle-kit falha com uma mensagem genérica que
// não diz o que fazer.
const NEEDS_DB = ["migrate", "push", "studio", "pull", "check"];
if (!url && process.argv.some((arg) => NEEDS_DB.includes(arg))) {
  throw new Error(
    [
      "DATABASE_URL não encontrada.",
      "",
      "Crie um arquivo .env.local na raiz do projeto com:",
      "",
      "  DATABASE_URL=postgres://usuario:senha@host:6543/postgres",
      "",
      "O .gitignore já exclui esse arquivo — a senha não vai para o repositório.",
      "Onde obter a connection string: docs/deploy.md, passo 2.",
    ].join("\n"),
  );
}

export default defineConfig({
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  // Só necessário para migrate/push/studio contra banco externo. Em dev as
  // migrations são aplicadas pela factory em `src/server/db` sobre o PGlite.
  ...(url ? { dbCredentials: { url } } : {}),
});
