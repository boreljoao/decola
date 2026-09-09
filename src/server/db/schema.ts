import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Schema Decola — dialeto Postgres (PGlite em dev, Supabase em produção).
 * Invariantes (spec §4): toda entidade privada carrega workspace_id; ledgers são
 * append-only; unicidade para dedup de eventos/operações.
 */

// ── Enums ────────────────────────────────────────────────────────────────────

export const workspaceRole = pgEnum("workspace_role", [
  "owner",
  "admin",
  "editor",
  "viewer",
]);

export const niche = pgEnum("niche", [
  "estetica_beleza",
  "saude",
  "servicos_locais",
  "gastronomia",
  "infoprodutos",
  "outro",
]);

export const briefingMode = pgEnum("briefing_mode", ["rapido", "completo"]);

export const briefingStatus = pgEnum("briefing_status", [
  "draft",
  "completed",
]);

export const pageStatus = pgEnum("page_status", [
  "draft",
  "ready",
  "publishing",
  "live",
  "publish_failed",
  "paused",
  "archived",
]);

export const pageVersionSource = pgEnum("page_version_source", [
  "generation",
  "manual_edit",
  "ai_edit",
  "rollback",
]);

export const deploymentStatus = pgEnum("deployment_status", [
  "queued",
  "building",
  "live",
  "failed",
  "superseded",
  "unpublished",
]);

export const generationJobStatus = pgEnum("generation_job_status", [
  "queued",
  "running",
  "completed",
  "failed",
  "canceled",
]);

export const stepStatus = pgEnum("step_status", [
  "pending",
  "running",
  "completed",
  "failed",
  "skipped",
]);

export const jobStatus = pgEnum("job_status", [
  "pending",
  "running",
  "completed",
  "failed",
  "canceled",
]);

export const leadStatus = pgEnum("lead_status", [
  "novo",
  "em_atendimento",
  "concluido",
]);

export const emailStatus = pgEnum("email_status", [
  "queued",
  "sent",
  "failed",
  "dev_written",
]);

export const conversionType = pgEnum("conversion_type", [
  "whatsapp",
  "lead_form",
  "agendamento",
  "compra",
  "download",
]);

// ── Identidade ───────────────────────────────────────────────────────────────

export const profiles = pgTable("profiles", {
  /** Igual ao id do provedor de Auth (Supabase) quando configurado. */
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  displayName: text("display_name"),
  /** Privilégio administrativo da plataforma — separado de papel de workspace. */
  platformAdmin: boolean("platform_admin").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Sessões server-side usadas pelo DevAuthProvider (nunca em produção). */
export const sessions = pgTable(
  "sessions",
  {
    /** hash SHA-256 do token — o token em si só vive no cookie httpOnly. */
    tokenHash: text("token_hash").primaryKey(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("sessions_profile_idx").on(t.profileId)],
);

export const workspaces = pgTable("workspaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  personal: boolean("personal").notNull().default(true),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => profiles.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const memberships = pgTable(
  "memberships",
  {
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    role: workspaceRole("role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.workspaceId, t.profileId] }),
    index("memberships_profile_idx").on(t.profileId),
  ],
);

// ── Produto ──────────────────────────────────────────────────────────────────

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    niche: niche("niche").notNull().default("outro"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => profiles.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("projects_workspace_idx").on(t.workspaceId)],
);

export const briefings = pgTable(
  "briefings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .unique()
      .references(() => projects.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    mode: briefingMode("mode").notNull().default("rapido"),
    status: briefingStatus("status").notNull().default("draft"),
    currentRevision: integer("current_revision").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("briefings_workspace_idx").on(t.workspaceId)],
);

export const briefingRevisions = pgTable(
  "briefing_revisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    briefingId: uuid("briefing_id")
      .notNull()
      .references(() => briefings.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    revision: integer("revision").notNull(),
    /** Respostas: { [questionId]: { value, origin: "user"|"transcribed"|"inferred" } } */
    answers: jsonb("answers").notNull(),
    answersHash: text("answers_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("briefing_revisions_unique").on(t.briefingId, t.revision),
  ],
);

// ── Páginas ──────────────────────────────────────────────────────────────────

export const pages = pgTable(
  "pages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** Slug de publicação: `{slug}.<PUBLISH_ROOT_DOMAIN>`. */
    slug: text("slug").unique(),
    status: pageStatus("status").notNull().default("draft"),
    currentVersionId: uuid("current_version_id"),
    publishedVersionId: uuid("published_version_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("pages_workspace_idx").on(t.workspaceId),
    index("pages_project_idx").on(t.projectId),
  ],
);

export const pageVersions = pgTable(
  "page_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pageId: uuid("page_id")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    /** PageDocument validado por Zod (schemaVersion embutido). */
    document: jsonb("document").notNull(),
    source: pageVersionSource("source").notNull(),
    generationJobId: uuid("generation_job_id"),
    createdBy: uuid("created_by").references(() => profiles.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("page_versions_unique").on(t.pageId, t.version)],
);

export const publicationDeployments = pgTable(
  "publication_deployments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pageId: uuid("page_id")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    pageVersionId: uuid("page_version_id")
      .notNull()
      .references(() => pageVersions.id),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    status: deploymentStatus("status").notNull().default("queued"),
    host: text("host").notNull(),
    /** Marca Decola exibida (plano Free). Snapshot no momento do deploy. */
    showBadge: boolean("show_badge").notNull().default(true),
    error: text("error"),
    createdBy: uuid("created_by").references(() => profiles.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [index("deployments_page_idx").on(t.pageId)],
);

// ── Geração ──────────────────────────────────────────────────────────────────

export const generationJobs = pgTable(
  "generation_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    briefingRevisionId: uuid("briefing_revision_id")
      .notNull()
      .references(() => briefingRevisions.id),
    status: generationJobStatus("status").notNull().default("queued"),
    /** "rules" (determinístico) ou "anthropic" (LLM). Registrado em provenance. */
    engine: text("engine").notNull(),
    currentStep: text("current_step"),
    resultPageVersionId: uuid("result_page_version_id"),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    index("generation_jobs_project_idx").on(t.projectId),
    // Um job por revisão de briefing: reexecutar reutiliza, não duplica.
    uniqueIndex("generation_jobs_revision_unique").on(t.briefingRevisionId),
  ],
);

export const generationSteps = pgTable(
  "generation_steps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    generationJobId: uuid("generation_job_id")
      .notNull()
      .references(() => generationJobs.id, { onDelete: "cascade" }),
    step: text("step").notNull(),
    status: stepStatus("status").notNull().default("pending"),
    attempt: integer("attempt").notNull().default(0),
    inputHash: text("input_hash"),
    output: jsonb("output"),
    error: text("error"),
    durationMs: integer("duration_ms"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("generation_steps_unique").on(t.generationJobId, t.step)],
);

// ── Fila durável ─────────────────────────────────────────────────────────────

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: text("type").notNull(),
    payload: jsonb("payload").notNull(),
    status: jobStatus("status").notNull().default("pending"),
    runAt: timestamp("run_at", { withTimezone: true }).notNull().defaultNow(),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(5),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    lockedBy: text("locked_by"),
    dedupKey: text("dedup_key"),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("jobs_dedup_unique").on(t.dedupKey),
    index("jobs_poll_idx").on(t.status, t.runAt),
  ],
);

// ── Leads e analytics ────────────────────────────────────────────────────────

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    pageId: uuid("page_id")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    pageVersionId: uuid("page_version_id"),
    /** Campos enviados no formulário (validados server-side). Nunca vira evento público. */
    data: jsonb("data").notNull(),
    status: leadStatus("status").notNull().default("novo"),
    dedupKey: text("dedup_key"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("leads_workspace_idx").on(t.workspaceId, t.pageId),
    uniqueIndex("leads_dedup_unique").on(t.dedupKey),
  ],
);

export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    pageId: uuid("page_id")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    pageVersionId: uuid("page_version_id"),
    /** Contrato §13.1: page_view, cta_click, whatsapp_click, form_submit_success… */
    type: text("type").notNull(),
    /** Id pseudônimo de sessão, presente apenas com consentimento. */
    sessionKey: text("session_key"),
    /** Id gerado no cliente para dedup de reenvio. */
    eventKey: text("event_key"),
    utm: jsonb("utm"),
    referrerHost: text("referrer_host"),
    experimentVariantId: uuid("experiment_variant_id"),
    day: date("day").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("analytics_event_key_unique").on(t.eventKey),
    index("analytics_page_day_idx").on(t.pageId, t.day),
  ],
);

// ── Operação ─────────────────────────────────────────────────────────────────

export const emailDeliveries = pgTable(
  "email_deliveries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id").references(() => workspaces.id, {
      onDelete: "set null",
    }),
    toEmail: text("to_email").notNull(),
    template: text("template").notNull(),
    subject: text("subject").notNull(),
    payload: jsonb("payload"),
    status: emailStatus("status").notNull().default("queued"),
    dedupKey: text("dedup_key"),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("email_dedup_unique").on(t.dedupKey)],
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id").references(() => workspaces.id, {
      onDelete: "set null",
    }),
    actorProfileId: uuid("actor_profile_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    target: text("target"),
    meta: jsonb("meta"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("audit_workspace_idx").on(t.workspaceId)],
);
