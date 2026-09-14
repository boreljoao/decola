/**
 * Migrations como etapa do deploy (decisão D-015).
 *
 * Roda antes do `next build` na Vercel. Regras, na ordem em que são checadas:
 *
 * 1. Só em produção (`VERCEL_ENV=production`). Deploys de preview — as
 *    branches de PR — recebem as mesmas variáveis do banco; migrar a partir
 *    deles alteraria o banco de produção antes do merge.
 * 2. Sem banco configurado, não faz nada: o build segue e o site estático
 *    continua no ar.
 * 3. Prefere a conexão direta, porque DDL não combina com pooler em modo
 *    transação. Se a direta não conectar, tenta a do pooler — no Supabase a
 *    conexão direta pode ser só IPv6, e a máquina de build pode não ter IPv6.
 * 4. Falha de migration derruba o build. A Vercel mantém o deploy anterior no
 *    ar, em vez de publicar código que espera um schema que não existe.
 *
 * Nunca imprime a connection string: ela contém a senha do banco.
 */
import path from "node:path";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

const MIGRATIONS_FOLDER = path.join(process.cwd(), "drizzle");

// Mesmos aliases de src/config/env.ts (ENV_ALIASES) e mesmos parâmetros de
// src/server/db. Duplicados porque este script roda com Node puro, antes do
// build de TypeScript existir.
const FOREIGN_PARAMS = ["supa", "pgbouncer", "connection_limit", "pool_timeout", "schema"];

function pick(...names) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

function sanitize(raw) {
  try {
    const url = new URL(raw);
    for (const param of FOREIGN_PARAMS) url.searchParams.delete(param);
    return url.toString();
  } catch {
    return raw;
  }
}

const CONNECTION_ERRORS = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ENOTFOUND",
  "ETIMEDOUT",
  "ENETUNREACH",
  "EHOSTUNREACH",
  "EAI_AGAIN",
  "CONNECT_TIMEOUT",
]);

// O migrator do Drizzle embrulha o erro do driver ("Failed query: ...") e guarda
// o original em `cause`. O código de rede fica lá: olhando só o erro de fora, a
// conexão recusada parecia falha de migration e o fallback nunca rodava.
function rootCause(err) {
  let current = err;
  for (let depth = 0; depth < 5 && current?.cause; depth++) current = current.cause;
  return current;
}

function isConnectionError(err) {
  const code = rootCause(err)?.code;
  return typeof code === "string" && CONNECTION_ERRORS.has(code);
}

async function runMigrations(url) {
  const sql = postgres(sanitize(url), {
    max: 1,
    prepare: false,
    connect_timeout: 15,
    onnotice: () => {},
  });
  try {
    await migrate(drizzle(sql), { migrationsFolder: MIGRATIONS_FOLDER });
  } finally {
    await sql.end({ timeout: 5 }).catch(() => {});
  }
}

async function main() {
  if (process.env.VERCEL_ENV !== "production") {
    console.log(
      `[decola:migrate] ignorado: VERCEL_ENV=${process.env.VERCEL_ENV ?? "(ausente)"}. ` +
        "Migrations só rodam no deploy de produção.",
    );
    return 0;
  }

  const direct = pick("DATABASE_URL_UNPOOLED", "POSTGRES_URL_NON_POOLING");
  const pooled = pick("DATABASE_URL", "POSTGRES_URL");
  const attempts = [];
  if (direct) attempts.push({ label: "conexão direta", url: direct });
  if (pooled && pooled !== direct) attempts.push({ label: "pooler", url: pooled });

  if (attempts.length === 0) {
    console.log(
      "[decola:migrate] ignorado: nenhum banco configurado (DATABASE_URL ou POSTGRES_URL).",
    );
    return 0;
  }

  for (const [index, attempt] of attempts.entries()) {
    try {
      await runMigrations(attempt.url);
      console.log(`[decola:migrate] migrations aplicadas via ${attempt.label}.`);
      return 0;
    } catch (err) {
      const cause = rootCause(err);
      const code = cause?.code ?? "sem código";
      const next = attempts[index + 1];
      if (isConnectionError(err) && next) {
        console.warn(
          `[decola:migrate] ${attempt.label} não conectou (${code}); tentando ${next.label}.`,
        );
        continue;
      }
      // Mensagens do driver trazem host, porta e usuário — não a senha.
      console.error(
        `[decola:migrate] falhou via ${attempt.label} (${code}): ${cause?.message ?? err}`,
      );
      return 1;
    }
  }
  return 1;
}

process.exitCode = await main();
