import "server-only";
import { z } from "zod";

/**
 * Validação de ambiente no boot (spec §14/§20).
 * - Variáveis ausentes desabilitam a capability correspondente com diagnóstico legível.
 * - Em produção, requisitos duros (banco, segredo de sessão) derrubam o boot em vez de
 *   cair silenciosamente em mock.
 */

const AppMode = z.enum(["demo", "development", "test", "production"]);
export type AppMode = z.infer<typeof AppMode>;

const rawSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DECOLA_MODE: AppMode.optional(),

  // App / hosts
  APP_URL: z.string().url().default("http://localhost:3000"),
  PUBLISH_ROOT_DOMAIN: z.string().default("localhost:3000"),
  SESSION_SECRET: z.string().min(16).optional(),

  // Banco
  DATABASE_URL: z.string().optional(),
  /** Subpasta de .data/ — o prefixo .data é fixo para escopo estático do build. */
  PGLITE_DIR: z.string().default("pglite"),

  // Supabase (Auth/Storage) — implementado, aguardando configuração
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  // Pagamentos
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  MERCADOPAGO_ACCESS_TOKEN: z.string().optional(),
  MERCADOPAGO_WEBHOOK_SECRET: z.string().optional(),

  // IA
  ANTHROPIC_API_KEY: z.string().optional(),
  GENERATION_MODEL: z.string().default("claude-sonnet-5"),
  /** Transcrição de áudio do briefing (Whisper). Sem ela, só texto. */
  OPENAI_API_KEY: z.string().optional(),

  // E-mail
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),

  // Observabilidade
  SENTRY_DSN: z.string().optional(),

  // Storage local (dev) — subpastas de .data/
  LOCAL_STORAGE_DIR: z.string().default("storage"),
  LOCAL_EMAIL_OUTBOX_DIR: z.string().default("outbox-emails"),

  // Worker
  JOB_DRAIN_TOKEN: z.string().optional(),
});

export type RawEnv = z.infer<typeof rawSchema>;

function resolveMode(raw: RawEnv): AppMode {
  if (raw.DECOLA_MODE) return raw.DECOLA_MODE;
  if (raw.NODE_ENV === "production") return "production";
  if (raw.NODE_ENV === "test") return "test";
  return "development";
}

export interface Capabilities {
  /** Banco real externo (Supabase/Postgres) configurado. */
  externalDatabase: boolean;
  /** Auth de produção (Supabase) configurada. */
  supabaseAuth: boolean;
  supabaseStorage: boolean;
  stripe: boolean;
  mercadopagoPix: boolean;
  /** Geração por LLM (Anthropic). Sem ela, motor determinístico identificado. */
  llmGeneration: boolean;
  /** Transcrição de áudio. Sem ela, o áudio é gravado mas não transcrito. */
  audioTranscription: boolean;
  resendEmail: boolean;
  sentry: boolean;
}

export interface Env extends RawEnv {
  mode: AppMode;
  capabilities: Capabilities;
}

/**
 * Uma variável **declarada e vazia** significa "não configurada", e não "valor
 * inválido". Painéis de deploy (e arquivos .env colados) criam a chave com
 * valor em branco o tempo todo; sem esta limpeza, `.default()` e `.optional()`
 * do Zod não se aplicam — eles só valem para `undefined` — e o boot falha com
 * "Invalid URL" em vez de usar o default.
 *
 * O valor em si não é alterado: só decidimos, pelo `trim`, se a chave existe.
 */
function definedEntries(source: NodeJS.ProcessEnv): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(source)) {
    if (typeof value !== "string") continue;
    if (value.trim() === "") continue;
    result[key] = value;
  }
  return result;
}

function build(): Env {
  const parsed = rawSchema.safeParse(definedEntries(process.env));
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Configuração de ambiente inválida:\n${issues}`);
  }
  const raw = parsed.data;
  const mode = resolveMode(raw);

  const capabilities: Capabilities = {
    externalDatabase: Boolean(raw.DATABASE_URL),
    supabaseAuth: Boolean(
      raw.NEXT_PUBLIC_SUPABASE_URL && raw.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ),
    supabaseStorage: Boolean(
      raw.NEXT_PUBLIC_SUPABASE_URL && raw.SUPABASE_SERVICE_ROLE_KEY,
    ),
    stripe: Boolean(raw.STRIPE_SECRET_KEY && raw.STRIPE_WEBHOOK_SECRET),
    mercadopagoPix: Boolean(raw.MERCADOPAGO_ACCESS_TOKEN),
    llmGeneration: Boolean(raw.ANTHROPIC_API_KEY),
    audioTranscription: Boolean(raw.OPENAI_API_KEY),
    resendEmail: Boolean(raw.RESEND_API_KEY && raw.EMAIL_FROM),
    sentry: Boolean(raw.SENTRY_DSN),
  };

  // Durante o build (`next build`), segredos de runtime não existem — a
  // validação dura acontece no primeiro request do servidor de produção.
  const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
  if (mode === "production" && !isBuildPhase) {
    const hard: string[] = [];
    if (!capabilities.externalDatabase) hard.push("DATABASE_URL");
    if (!raw.SESSION_SECRET) hard.push("SESSION_SECRET");
    if (!capabilities.supabaseAuth)
      hard.push("NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
    if (hard.length > 0) {
      throw new Error(
        `Produção exige configuração obrigatória ausente: ${hard.join(", ")}. ` +
          "Nenhum fallback de desenvolvimento é permitido em produção.",
      );
    }
  }

  return { ...raw, mode, capabilities };
}

let cached: Env | undefined;

export function env(): Env {
  if (!cached) cached = build();
  return cached;
}

/** Somente para testes: força reavaliação do ambiente. */
export function __resetEnvForTests() {
  cached = undefined;
}
