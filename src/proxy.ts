import { NextResponse, type NextRequest } from "next/server";
import { refreshAuthSession } from "@/server/auth/session-refresh";

/**
 * Roteamento por host (decisão D-007): `{slug}.<PUBLISH_ROOT_DOMAIN>` serve a
 * versão publicada via rewrite para /sites/[slug]. O host é normalizado e o
 * slug validado — nunca se usa host arbitrário para consultar tenants
 * (spec §11.1). A autorização real das rotas /app acontece no servidor; aqui
 * só há conveniência de navegação (spec §6).
 */

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/;
const HOST_RE = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

export async function proxy(request: NextRequest) {
  const rawHost = (request.headers.get("host") ?? "").toLowerCase();
  const host = rawHost.replace(/:\d+$/, "");
  const root = (process.env.PUBLISH_ROOT_DOMAIN ?? "localhost:3000")
    .toLowerCase()
    .replace(/:\d+$/, "");
  const appHost = safeHost(process.env.APP_URL ?? "http://localhost:3000");

  // Classificar um host como "domínio de cliente" exige saber qual é o host do
  // app. Sem APP_URL não sabemos, e o default de dev (localhost) não bate com
  // nada em produção.
  const appHostKnown = (process.env.APP_URL ?? "").trim() !== "";
  // Endereços *.vercel.app são da plataforma (aliases e URL de cada deploy):
  // nunca podem ser domínio de cliente, mesmo com APP_URL configurada.
  const platformHost = host.endsWith(".vercel.app");

  const isAppHost = rawHost === appHost || host === appHost.replace(/:\d+$/, "");

  // 1. Subdomínio Decola: {slug}.<root>
  if (!isAppHost && host.endsWith(`.${root}`)) {
    const slug = host.slice(0, -(root.length + 1));
    if (SLUG_RE.test(slug)) {
      const url = request.nextUrl.clone();
      url.pathname = `/sites/${slug}`;
      return NextResponse.rewrite(url);
    }
    return new NextResponse("Página não encontrada.", { status: 404 });
  }

  // 2. Domínio próprio: qualquer outro host válido é resolvido por mapeamento
  //    verificado no banco (o proxy não consulta banco; a rota faz isso e
  //    recusa hosts sem verificação de posse).
  //
  //    Só com APP_URL configurada. Sem ela, o host do primeiro deploy
  //    (`*.vercel.app`) cairia aqui e TODA requisição — inclusive a home
  //    estática — viraria busca de um domínio de cliente que não existe. O site
  //    inteiro respondia 500 antes de renderizar qualquer coisa.
  if (
    appHostKnown &&
    !platformHost &&
    !isAppHost &&
    host !== root &&
    HOST_RE.test(host)
  ) {
    const url = request.nextUrl.clone();
    url.pathname = `/sites/dominio/${encodeURIComponent(host)}`;
    return NextResponse.rewrite(url);
  }

  // Bloqueia acesso direto ao caminho interno /sites/* pelo host do app.
  if (request.nextUrl.pathname.startsWith("/sites/")) {
    return new NextResponse("Não encontrado.", { status: 404 });
  }

  return refreshAuthSession(request);
}

function safeHost(url: string): string {
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return "localhost:3000";
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
