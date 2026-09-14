import "server-only";
import { z } from "zod";
import { resolveEnvSource } from "./env-source";

/**
 * Validação de ambiente no boot (spec §14/§20).
 * - Variáveis ausentes desabilitam a capability correspondente com diagnóstico legível.
 * - Em produção, requisitos duros (banco e Auth) derrubam o boot em vez de
 *   cair silenciosamente em mock.
 * - Aliases de integração e chaves vazias são resolvidos antes, em
 *   `env-source.ts`.
 */

const AppMode = z.enum(["demo", "development", "test", "production"]);
export type AppMode = z.infer<typeof AppMode>;

export type PublishingMode = "subdomain" | "path";

const rawSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DECOLA_MODE: AppMode.optional(),

  // App / hosts
  APP_URL: z.string().url().default("http://localhost:3000"),
  PUBLISH_ROOT_DOMAIN: z.string().default("localhost:3000"),
  /** Força o formato do endereço público; sem valor, decide pelo ambiente. */
  PUBLISH_MODE: z.enum(["subdomain", "path"]).optional(),
  /**
   * Nenhum fluxo atual lê este valor: as sessões de dev são tokens aleatórios
   * com hash no banco, e as de produção pertencem ao Supabase. Continua aceito,
   * mas deixou de ser exigido no boot — exigir um segredo que nada usa só
   * acrescentava um passo de configuração.
   */
  SESSION_SECRET: z.string().min(16).optional(),

  // Banco
  DATABASE_URL: z.string().optional(),
  /** Conexão direta (sem pooler). Só as migrations do deploy usam. */
  DATABASE_URL_UNPOOLED: z.string().optional(),
  /** Subpasta de .data/ — o prefixo .data é fixo para escopo estático do build. */
  PGLITE_DIR: z.string().default("pglite"),

  // Supabase (Auth/Storage)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  /** Chave pública do projeto — a antiga "anon" ou a nova "publishable". */
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  /** Segredo de backend — a antiga "service_role" ou a nova "secret". */
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

  // Plataforma — variáveis de sistema da Vercel
  VERCEL: z.string().optional(),
  VERCEL_ENV: z.string().optional(),
  VERCEL_PROJECT_PRODUCTION_URL: z.string().optional(),
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
  /**
   * Formato do endereço público das páginas publicadas (decisão D-014).
   * `subdomain` exige DNS wildcard; `path` serve em `<APP_URL>/p/<slug>`.
   */
  publishing: PublishingMode;
  /** Rodando na Vercel — limite de corpo de requisição e variáveis de sistema. */
  onVercel: boolean;
}

function build(): Env {
  const source = resolveEnvSource(process.env);
  const parsed = rawSchema.safeParse(source);
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

  // Subdomínio exige DNS wildcard, então só vale com domínio configurado de
  // propósito. Fora de produção, *.localhost resolve sozinho no navegador.
  const publishing: PublishingMode =
    raw.PUBLISH_MODE ??
    (source.PUBLISH_ROOT_DOMAIN || mode !== "production" ? "subdomain" : "path");

  // Durante o build (`next build`), segredos de runtime não existem — a
  // validação dura acontece no primeiro request do servidor de produção.
  const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
  if (mode === "production" && !isBuildPhase) {
    const hard: string[] = [];
    if (!capabilities.externalDatabase) hard.push("DATABASE_URL (ou POSTGRES_URL)");
    if (!capabilities.supabaseAuth)
      hard.push(
        "NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY (ou a chave publishable)",
      );
    if (hard.length > 0) {
      throw new Error(
        `Produção exige configuração obrigatória ausente: ${hard.join(", ")}. ` +
          "Nenhum fallback de desenvolvimento é permitido em produção.",
      );
    }
  }

  return {
    ...raw,
    mode,
    capabilities,
    publishing,
    onVercel: Boolean(raw.VERCEL),
  };
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
