/**
 * Leitura do ambiente sem validação e sem `server-only`.
 *
 * O proxy usa isto em toda requisição. Ali, um import de `server-only` ou um
 * erro de configuração derrubariam até o site estático — por isso nada aqui
 * lança.
 */

/**
 * Uma variável **declarada e vazia** significa "não configurada", e não "valor
 * inválido". Painéis de deploy (e arquivos .env colados) criam a chave com
 * valor em branco o tempo todo; sem esta limpeza, `.default()` e `.optional()`
 * do Zod não se aplicam — eles só valem para `undefined` — e o boot falha com
 * "Invalid URL" em vez de usar o default.
 *
 * O valor em si não é alterado: só decidimos, pelo `trim`, se a chave existe.
 */
export function definedEntries(source: NodeJS.ProcessEnv): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(source)) {
    if (typeof value !== "string") continue;
    if (value.trim() === "") continue;
    result[key] = value;
  }
  return result;
}

/**
 * Outros nomes que integrações dão às mesmas credenciais.
 *
 * A integração Supabase da Vercel Marketplace injeta `POSTGRES_URL`,
 * `POSTGRES_URL_NON_POOLING`, `SUPABASE_URL`,
 * `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` e `SUPABASE_SECRET_KEY` — e nenhum
 * dos nomes que o app lia (conferido na documentação do Supabase em
 * 2026-09-14). Sem esta tabela, conectar a integração não ativava nada e o
 * boot de produção continuava falhando.
 *
 * O nome canônico sempre vence: o alias só preenche o que está ausente.
 */
export const ENV_ALIASES: ReadonlyArray<readonly [string, ...string[]]> = [
  ["DATABASE_URL", "POSTGRES_URL"],
  ["DATABASE_URL_UNPOOLED", "POSTGRES_URL_NON_POOLING"],
  ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"],
  [
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_ANON_KEY",
  ],
  ["SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY"],
];

/**
 * Ambiente efetivo: sem chaves vazias, com aliases resolvidos e `APP_URL`
 * derivada da URL de produção da Vercel quando não foi configurada.
 */
export function resolveEnvSource(source: NodeJS.ProcessEnv): Record<string, string> {
  const result = definedEntries(source);
  for (const [canonical, ...aliases] of ENV_ALIASES) {
    if (result[canonical]) continue;
    const found = aliases.find((alias) => result[alias]);
    if (found) result[canonical] = result[found];
  }
  // Sem isso a URL do app só seria conhecida depois do primeiro deploy, e o
  // primeiro deploy não funcionaria sem ela.
  if (!result.APP_URL && result.VERCEL_PROJECT_PRODUCTION_URL) {
    result.APP_URL = `https://${result.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return result;
}
