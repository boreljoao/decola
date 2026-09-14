import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { __resetEnvForTests } from "@/config/env";
import {
  publicAddressPattern,
  publicPageAddress,
  publicPageUrl,
} from "@/features/pages/public-url";

/**
 * Antes, seis arquivos montavam `{slug}.<domínio>` por conta própria — e em
 * `*.vercel.app` o endereço resultante não resolvia.
 */

const KEYS: string[] = [
  "APP_URL",
  "PUBLISH_ROOT_DOMAIN",
  "PUBLISH_MODE",
  "DECOLA_MODE",
  "DATABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "VERCEL_PROJECT_PRODUCTION_URL",
];
let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = {};
  for (const key of KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
  __resetEnvForTests();
});

afterEach(() => {
  for (const key of KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
  __resetEnvForTests();
});

function producaoConfigurada() {
  process.env.DECOLA_MODE = "production";
  process.env.DATABASE_URL = "postgres://u:p@db.exemplo.com:5432/db";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://projeto.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "chave-publica";
}

describe("subdomínio", () => {
  it("usa o domínio de publicação configurado", () => {
    process.env.APP_URL = "https://app.decola.com.br";
    process.env.PUBLISH_ROOT_DOMAIN = "decola.com.br";

    expect(publicPageUrl("padaria")).toBe("https://padaria.decola.com.br");
    expect(publicAddressPattern()).toEqual({ prefix: "", suffix: ".decola.com.br" });
  });

  it("em dev continua em *.localhost", () => {
    expect(publicPageUrl("padaria")).toBe("http://padaria.localhost:3000");
  });
});

describe("por caminho", () => {
  it("em produção sem domínio de publicação, serve no host do app", () => {
    producaoConfigurada();
    process.env.APP_URL = "https://decola-ruby.vercel.app";

    expect(publicPageAddress("padaria")).toBe("decola-ruby.vercel.app/p/padaria");
    expect(publicPageUrl("padaria")).toBe("https://decola-ruby.vercel.app/p/padaria");
    expect(publicAddressPattern()).toEqual({
      prefix: "decola-ruby.vercel.app/p/",
      suffix: "",
    });
  });

  it("funciona só com a URL de produção da Vercel, sem APP_URL", () => {
    producaoConfigurada();
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "decola-ruby.vercel.app";

    expect(publicPageUrl("padaria")).toBe("https://decola-ruby.vercel.app/p/padaria");
  });
});
