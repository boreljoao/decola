/**
 * Parâmetros que ferramentas acrescentam à connection string mas o Postgres
 * não conhece. O postgres-js repassa ao servidor, como parâmetro de sessão,
 * todo query param que ele próprio não reconhece — e o servidor recusa a
 * conexão com "unrecognized configuration parameter". Strings geradas para
 * Prisma trazem `pgbouncer` e `connection_limit`; a do Supabase pode trazer
 * `supa`.
 */
const FOREIGN_PARAMS = ["supa", "pgbouncer", "connection_limit", "pool_timeout", "schema"];

export function sanitizeDatabaseUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return raw;
  }
  for (const param of FOREIGN_PARAMS) url.searchParams.delete(param);
  return url.toString();
}
