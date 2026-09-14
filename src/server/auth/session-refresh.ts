import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { resolveEnvSource } from "@/config/env-source";
import { hardenAuthCookie } from "./cookies";

/**
 * Renova a sessão do Supabase antes de a página renderizar — o padrão do
 * @supabase/ssr para Next.js.
 *
 * Server Components não conseguem gravar cookie. Sem esta etapa, quando o
 * token de acesso expira (1 h) cada renderização renova com o refresh token sem
 * conseguir salvar o novo; o refresh token é de uso único, é reaproveitado, e o
 * Supabase revoga a sessão.
 *
 * `getClaims()` valida o JWT e só chama o servidor de Auth quando precisa
 * renovar. Nunca lança: sem Supabase configurado ou com sessão inválida, a
 * requisição segue e a própria página decide o que fazer.
 */
export async function refreshAuthSession(
  request: NextRequest,
): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  const source = resolveEnvSource(process.env);
  const url = source.NEXT_PUBLIC_SUPABASE_URL;
  const key = source.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;

  const secure = (source.APP_URL ?? "").startsWith("https");
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet, headers) => {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, hardenAuthCookie(options, secure));
        }
        // Resposta com cookie de sessão não pode ir para cache compartilhado.
        for (const [header, value] of Object.entries(headers ?? {})) {
          response.headers.set(header, value);
        }
      },
    },
  });

  try {
    await supabase.auth.getClaims();
  } catch {
    // Provedor fora do ar: a navegação segue sem renovar.
  }
  return response;
}
