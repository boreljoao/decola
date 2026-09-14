/**
 * Peças do fluxo de autenticação usadas por páginas, ações e pela rota de
 * callback. Ficam fora de `actions.ts` porque arquivos "use server" só podem
 * exportar funções async.
 */

/**
 * E-mail que aguarda confirmação. Vai num cookie httpOnly de 1 hora, e não na
 * URL — query string acaba em log de servidor, histórico e cabeçalho Referer.
 */
export const PENDING_EMAIL_COOKIE = "decola_verificar_email";
export const PENDING_EMAIL_MAX_AGE = 60 * 60;

/**
 * Destino depois do login: só caminho interno. O navegador trata `//host` e
 * `/\host` como URL absoluta, o que viraria redirecionamento aberto.
 */
export function safeNext(raw: unknown, fallback = "/app"): string {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//") || value.startsWith("/\\")) return fallback;
  for (const char of value) {
    if (char.charCodeAt(0) < 0x20) return fallback;
  }
  return value;
}
