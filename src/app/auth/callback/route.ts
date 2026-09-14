import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/features/auth/flow";
import { getAuthProvider } from "@/server/auth";

/**
 * Retorno dos links de e-mail do Supabase: confirmação de cadastro e
 * recuperação de senha. Sem esta rota, o link de confirmação caía em 404.
 *
 * O link chega com `code` (fluxo PKCE, padrão do @supabase/ssr) ou com
 * `token_hash` + `type` (templates de e-mail personalizados). Link expirado
 * volta do provedor com `error`/`error_code` na query.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const failed = new URL("/entrar", url.origin);
  failed.searchParams.set("aviso", "link");

  if (url.searchParams.get("error") || url.searchParams.get("error_code")) {
    return NextResponse.redirect(failed);
  }

  const result = await getAuthProvider().completeEmailLink({
    code: url.searchParams.get("code") ?? undefined,
    tokenHash: url.searchParams.get("token_hash") ?? undefined,
    type: url.searchParams.get("type") ?? undefined,
  });
  if (!result.ok) return NextResponse.redirect(failed);

  const next = safeNext(url.searchParams.get("next"));
  return NextResponse.redirect(new URL(next, url.origin));
}
