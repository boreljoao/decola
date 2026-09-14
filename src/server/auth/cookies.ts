import type { CookieOptions } from "@supabase/ssr";

/**
 * Nenhum cliente Supabase roda no navegador: toda chamada passa pelo servidor.
 * O cookie de sessão não precisa ser legível por JavaScript, então vai com
 * httpOnly — fora do alcance de qualquer script da página, inclusive de
 * terceiros.
 */
export function hardenAuthCookie(
  options: CookieOptions,
  secure: boolean,
): CookieOptions {
  return {
    ...options,
    path: options.path ?? "/",
    httpOnly: true,
    sameSite: "lax",
    secure,
  };
}
