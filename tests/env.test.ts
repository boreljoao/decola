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
