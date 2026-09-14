import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { __resetEnvForTests, env } from "@/config/env";

/**
 * Regressão do build que quebrou na Vercel.
 *
 * Painel de deploy e arquivo .env colado criam a chave com valor em branco o
 * tempo todo. `.default()` e `.optional()` do Zod só valem para `undefined`, então
 * `APP_URL=""` não caía no default — falhava com "Invalid URL" e derrubava o
 * build inteiro na prerenderização, antes mesmo de o guard de fase de build ter
 * chance de rodar.
 *
 * O contrato que estes testes fixam: declarada e vazia == ausente.
 */

// `string[]` e não `as const`: com o literal, o TypeScript estreita a chave para
// a união que inclui NODE_ENV, declarada readonly nos tipos do Next, e a
// restauração no afterEach não compila.
const KEYS: string[] = [
  "APP_URL",
  "PUBLISH_ROOT_DOMAIN",
  "SESSION_SECRET",
  "DATABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "ANTHROPIC_API_KEY",
  "DECOLA_MODE",
  "NEXT_PHASE",
  "PUBLISH_MODE",
  "DATABASE_URL_UNPOOLED",
  "SUPABASE_SERVICE_ROLE_KEY",
  "POSTGRES_URL",
  "POSTGRES_URL_NON_POOLING",
  "SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SECRET_KEY",
  "VERCEL",
  "VERCEL_ENV",
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

describe("variável declarada e vazia conta como ausente", () => {
  it("usa o default em vez de rejeitar string vazia", () => {
    process.env.APP_URL = "";
    process.env.PUBLISH_ROOT_DOMAIN = "";

    expect(env().APP_URL).toBe("http://localhost:3000");
    expect(env().PUBLISH_ROOT_DOMAIN).toBe("localhost:3000");
  });

  it("trata espaço em branco como vazio", () => {
    process.env.APP_URL = "   ";

    expect(env().APP_URL).toBe("http://localhost:3000");
  });

  it("não liga capability com credencial em branco", () => {
    process.env.DATABASE_URL = "";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "";
    process.env.ANTHROPIC_API_KEY = "";

    const capabilities = env().capabilities;
    expect(capabilities.externalDatabase).toBe(false);
    expect(capabilities.supabaseAuth).toBe(false);
    expect(capabilities.llmGeneration).toBe(false);
  });

  it("preserva o valor real quando existe", () => {
    process.env.APP_URL = "https://decola.com.br";

    expect(env().APP_URL).toBe("https://decola.com.br");
  });
});

describe("produção com variáveis em branco", () => {
  it("não derruba o build — a validação dura é do runtime", () => {
    process.env.DECOLA_MODE = "production";
    process.env.NEXT_PHASE = "phase-production-build";
    process.env.APP_URL = "";
    process.env.SESSION_SECRET = "";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "";

    expect(() => env()).not.toThrow();
  });

  it("falha no runtime dizendo o que falta, não 'Invalid URL'", () => {
    process.env.DECOLA_MODE = "production";
    process.env.APP_URL = "";
    process.env.SESSION_SECRET = "";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "";

    expect(() => env()).toThrow(/configuração obrigatória ausente/i);
    __resetEnvForTests();
    expect(() => env()).not.toThrow(/Invalid URL/);
  });
});

describe("nomes da integração Supabase da Vercel", () => {
  // Exatamente as variáveis que a integração injeta, sem nenhum nome canônico.
  function integracaoSupabase() {
    process.env.POSTGRES_URL = "postgres://u:p@pooler.exemplo.com:6543/postgres";
    process.env.POSTGRES_URL_NON_POOLING = "postgres://u:p@db.exemplo.com:5432/postgres";
    process.env.SUPABASE_URL = "https://projeto.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://projeto.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_teste";
    process.env.SUPABASE_SECRET_KEY = "sb_secret_teste";
  }

  it("liga banco, Auth e Storage só com eles", () => {
    integracaoSupabase();

    const e = env();
    expect(e.DATABASE_URL).toBe(process.env.POSTGRES_URL);
    expect(e.DATABASE_URL_UNPOOLED).toBe(process.env.POSTGRES_URL_NON_POOLING);
    expect(e.capabilities.externalDatabase).toBe(true);
    expect(e.capabilities.supabaseAuth).toBe(true);
    expect(e.capabilities.supabaseStorage).toBe(true);
  });

  it("sobe em produção sem SESSION_SECRET, que nenhum fluxo usa", () => {
    integracaoSupabase();
    process.env.DECOLA_MODE = "production";

    expect(() => env()).not.toThrow();
  });

  it("o nome canônico vence o alias", () => {
    integracaoSupabase();
    process.env.DATABASE_URL = "postgres://u:p@canonico.exemplo.com:5432/db";

    expect(env().DATABASE_URL).toBe("postgres://u:p@canonico.exemplo.com:5432/db");
  });
});

describe("URL do app na Vercel", () => {
  it("usa a URL de produção do projeto quando APP_URL não foi configurada", () => {
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "decola-ruby.vercel.app";

    expect(env().APP_URL).toBe("https://decola-ruby.vercel.app");
  });

  it("APP_URL configurada vence", () => {
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "decola-ruby.vercel.app";
    process.env.APP_URL = "https://app.decola.com.br";

    expect(env().APP_URL).toBe("https://app.decola.com.br");
  });
});

describe("formato do endereço público", () => {
  function producaoConfigurada() {
    process.env.DECOLA_MODE = "production";
    process.env.DATABASE_URL = "postgres://u:p@db.exemplo.com:5432/db";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://projeto.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "chave-publica";
  }

  it("produção sem domínio de publicação serve por caminho", () => {
    producaoConfigurada();

    expect(env().publishing).toBe("path");
  });

  it("produção com domínio de publicação usa subdomínio", () => {
    producaoConfigurada();
    process.env.PUBLISH_ROOT_DOMAIN = "decola.com.br";

    expect(env().publishing).toBe("subdomain");
  });

  it("fora de produção continua em subdomínio (*.localhost)", () => {
    expect(env().publishing).toBe("subdomain");
  });

  it("PUBLISH_MODE força o formato", () => {
    process.env.PUBLISH_MODE = "path";

    expect(env().publishing).toBe("path");
  });
});

