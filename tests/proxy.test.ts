import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { proxy } from "@/proxy";

/**
 * Regressão do primeiro deploy: o site inteiro respondia 500.
 *
 * Sem APP_URL, o host `*.vercel.app` não batia com o default de dev
 * (localhost) e caía na regra de domínio próprio de cliente. Toda requisição
 * virava `/sites/dominio/<host>`, que consulta o banco — então nem a home
 * estática aparecia.
 */

const KEYS: string[] = ["APP_URL", "PUBLISH_ROOT_DOMAIN"];
let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = {};
  for (const key of KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

function request(host: string, path = "/") {
  return new NextRequest(`https://${host}${path}`, { headers: { host } });
}

/** Destino da reescrita, ou null quando a requisição segue o fluxo normal. */
function rewriteTarget(response: Response): string | null {
  const target = response.headers.get("x-middleware-rewrite");
  return target ? new URL(target).pathname : null;
}

describe("sem APP_URL configurada", () => {
  it("serve o app no host do deploy em vez de procurar domínio de cliente", () => {
    const response = proxy(request("decola-ruby.vercel.app"));

    expect(rewriteTarget(response)).toBeNull();
    expect(response.status).toBe(200);
  });

  it("mantém o subdomínio de publicação em dev", () => {
    const response = proxy(request("padaria.localhost"));

    expect(rewriteTarget(response)).toBe("/sites/padaria");
  });

  it("recusa slug fora do formato", () => {
    const response = proxy(request("NAO_VALIDO_.localhost"));

    expect(response.status).toBe(404);
  });
});

describe("com APP_URL configurada", () => {
  beforeEach(() => {
    process.env.APP_URL = "https://app.decola.com.br";
    process.env.PUBLISH_ROOT_DOMAIN = "decola.com.br";
  });

  it("resolve domínio próprio do cliente", () => {
    const response = proxy(request("padaria-do-ze.com.br"));

    expect(rewriteTarget(response)).toBe("/sites/dominio/padaria-do-ze.com.br");
  });

  it("serve o app no próprio host", () => {
    const response = proxy(request("app.decola.com.br"));

    expect(rewriteTarget(response)).toBeNull();
  });

  it("resolve subdomínio de publicação", () => {
    const response = proxy(request("padaria.decola.com.br"));

    expect(rewriteTarget(response)).toBe("/sites/padaria");
  });

  it("bloqueia acesso direto ao caminho interno pelo host do app", () => {
    const response = proxy(request("app.decola.com.br", "/sites/padaria"));

    expect(response.status).toBe(404);
  });
});
