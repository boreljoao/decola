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

export const invitationStatus = pgEnum("invitation_status", [
  "pending",
  "accepted",
  "revoked",
  "expired",
]);

export const privacyRequestKind = pgEnum("privacy_request_kind", [
  "export",
  "delete",
]);

export const privacyRequestStatus = pgEnum("privacy_request_status", [
  "pending",
  "processing",
  "completed",
  "failed",
]);

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

/**
 * Convites de equipe (spec §15). O token só existe em hash: o valor original
 * vive apenas no link enviado, então vazamento do banco não permite aceitar.
 */
export const invitations = pgTable(
  "invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: workspaceRole("role").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    status: invitationStatus("status").notNull().default("pending"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    invitedBy: uuid("invited_by").references(() => profiles.id, {
      onDelete: "set null",
    }),
    acceptedBy: uuid("accepted_by").references(() => profiles.id, {
      onDelete: "set null",
    }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("invitations_workspace_idx").on(t.workspaceId),
    index("invitations_email_idx").on(t.email),
  ],
);

/** Solicitações de exportação/exclusão de dados (spec §16). */
export const privacyRequests = pgTable(
  "privacy_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id").references(() => workspaces.id, {
      onDelete: "set null",
    }),
    kind: privacyRequestKind("kind").notNull(),
    status: privacyRequestStatus("status").notNull().default("pending"),
    /** Arquivo de exportação, com expiração. */
    resultKey: text("result_key"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    /** Exclusão agendada: janela para arrependimento antes da remoção. */
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [index("privacy_requests_profile_idx").on(t.profileId)],
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

// ── Domínios próprios ────────────────────────────────────────────────────────

export const domainStatus = pgEnum("domain_status", [
  "pending_verification",
  "verified",
  "ssl_pending",
  "active",
  "failed",
  "detached",
]);

/**
 * Domínio próprio do cliente (spec §11.2). O host é único globalmente: dois
 * workspaces nunca disputam o mesmo endereço, e um domínio removido precisa
 * ser reverificado antes de ser reutilizado (evita takeover).
 */
export const domains = pgTable(
  "domains",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    pageId: uuid("page_id")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    /** Hostname normalizado em minúsculas, sem protocolo nem barra. */
    host: text("host").notNull(),
    status: domainStatus("status").notNull().default("pending_verification"),
    /** Valor que o cliente publica em um registro TXT para provar posse. */
    verificationToken: text("verification_token").notNull(),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    lastError: text("last_error"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    detachedAt: timestamp("detached_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // Host único entre TODOS os workspaces enquanto estiver vinculado.
    uniqueIndex("domains_host_unique").on(t.host),
    index("domains_page_idx").on(t.pageId),
  ],
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

// ── Assets (uploads do usuário) ──────────────────────────────────────────────

export const assetKind = pgEnum("asset_kind", ["logo", "image"]);

export const assets = pgTable(
  "assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    /** Projeto dono do asset — a biblioteca do editor é por projeto. */
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "cascade",
    }),
    kind: assetKind("kind").notNull().default("image"),
    /** Caminho no provider (filesystem local ou objeto no Storage). */
    storageKey: text("storage_key").notNull(),
    mimeType: text("mime_type").notNull(),
    bytes: integer("bytes").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    originalName: text("original_name"),
    /** Texto alternativo — acessibilidade (spec §9). */
    alt: text("alt"),
    uploadedBy: uuid("uploaded_by").references(() => profiles.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("assets_workspace_idx").on(t.workspaceId),
    index("assets_project_idx").on(t.projectId),
  ],
);

// ── Criativos ────────────────────────────────────────────────────────────────

export const creativeSetStatus = pgEnum("creative_set_status", [
  "queued",
  "running",
  "completed",
  "failed",
]);

export const creativeSets = pgTable(
  "creative_sets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    pageId: uuid("page_id")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    /** Versão da página no momento da geração — mudanças de oferta alertam desatualização. */
    pageVersionId: uuid("page_version_id")
      .notNull()
      .references(() => pageVersions.id),
    status: creativeSetStatus("status").notNull().default("queued"),
    /** Propostas de copy tipadas (meta/google/tiktok) validadas por Zod. */
    payload: jsonb("payload"),
    error: text("error"),
    createdBy: uuid("created_by").references(() => profiles.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [index("creative_sets_page_idx").on(t.pageId)],
);

export const creativeAssets = pgTable(
  "creative_assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    setId: uuid("set_id")
      .notNull()
      .references(() => creativeSets.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    format: text("format").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    filePath: text("file_path").notNull(),
    bytes: integer("bytes").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("creative_assets_set_idx").on(t.setId)],
);

// ── Receita: pedidos, pagamentos e direitos ──────────────────────────────────

export const orderStatus = pgEnum("order_status", [
  "pending",
  "awaiting_payment",
  "paid",
  "canceled",
  "expired",
  "refunded",
]);

export const paymentProviderEnum = pgEnum("payment_provider", [
  "stripe",
  "mercadopago",
]);

export const paymentStatus = pgEnum("payment_status", [
  "pending",
  "paid",
  "failed",
  "refunded",
  "partially_refunded",
]);

export const grantSource = pgEnum("grant_source", [
  "subscription",
  "one_time",
  "manual",
  "trial",
]);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    /** Snapshot imutável da oferta aceita (spec §3): preço, plano, período. */
    offerSnapshot: jsonb("offer_snapshot").notNull(),
    catalogVersion: text("catalog_version").notNull(),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull().default("BRL"),
    status: orderStatus("status").notNull().default("pending"),
    provider: paymentProviderEnum("provider").notNull(),
    /** Impede duplicar pedido pela mesma intenção de compra (spec §12.1). */
    idempotencyKey: text("idempotency_key").notNull(),
    providerCheckoutId: text("provider_checkout_id"),
    createdBy: uuid("created_by").references(() => profiles.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("orders_idempotency_unique").on(t.idempotencyKey),
    index("orders_workspace_idx").on(t.workspaceId),
  ],
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    provider: paymentProviderEnum("provider").notNull(),
    providerPaymentId: text("provider_payment_id").notNull(),
    status: paymentStatus("status").notNull().default("pending"),
    amountCents: integer("amount_cents").notNull(),
    refundedCents: integer("refunded_cents").notNull().default(0),
    method: text("method"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("payments_provider_unique").on(t.provider, t.providerPaymentId),
    index("payments_order_idx").on(t.orderId),
  ],
);

/**
 * Inbox de webhooks: `(provider, event_id)` único impede conceder duas vezes
 * pelo mesmo evento, mesmo com reentrega (spec §12.1).
 */
export const webhookInbox = pgTable(
  "webhook_inbox",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provider: paymentProviderEnum("provider").notNull(),
    eventId: text("event_id").notNull(),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload").notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    error: text("error"),
    receivedAt: timestamp("received_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("webhook_inbox_unique").on(t.provider, t.eventId)],
);

/** Concessão de direitos por período. Vitalício é grant separado da assinatura. */
export const entitlementGrants = pgTable(
  "entitlement_grants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    planId: text("plan_id").notNull(),
    source: grantSource("source").notNull(),
    orderId: uuid("order_id").references(() => orders.id, {
      onDelete: "set null",
    }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    /** null = sem prazo (licença vitalícia). */
    endsAt: timestamp("ends_at", { withTimezone: true }),
    /** Revogação por reembolso/chargeback — histórico é preservado. */
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revokedReason: text("revoked_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("grants_workspace_idx").on(t.workspaceId),
    // Um grant por pedido: reentrega de webhook não concede de novo.
    uniqueIndex("grants_order_unique").on(t.orderId),
  ],
);

// ── Créditos (Combustível) ───────────────────────────────────────────────────

export const creditLotSource = pgEnum("credit_lot_source", [
  "trial",
  "subscription",
  "purchase",
  "bonus",
]);

export const creditEntryKind = pgEnum("credit_entry_kind", [
  "grant",
  "reserve",
  "commit",
  "release",
  "expire",
  "adjust",
]);

export const creditLots = pgTable(
  "credit_lots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    source: creditLotSource("source").notNull(),
    amount: integer("amount").notNull(),
    consumed: integer("consumed").notNull().default(0),
    /** null = não expira (compra avulsa, por padrão desta versão). */
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    orderId: uuid("order_id").references(() => orders.id, {
      onDelete: "set null",
    }),
    /** Recarga mensal única por período: (workspace, source, periodKey). */
    periodKey: text("period_key"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("credit_lots_workspace_idx").on(t.workspaceId),
    uniqueIndex("credit_lots_period_unique").on(
      t.workspaceId,
      t.source,
      t.periodKey,
    ),
  ],
);

/** Ledger append-only: correções entram como novas linhas, nunca edição. */
export const creditLedger = pgTable(
  "credit_ledger",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    kind: creditEntryKind("kind").notNull(),
    /** Positivo concede, negativo consome. */
    amount: integer("amount").notNull(),
    lotId: uuid("lot_id").references(() => creditLots.id, {
      onDelete: "set null",
    }),
    /** Operação de negócio (ex.: `ai_edit:<versionId>`) — dedup de consumo. */
    operationKey: text("operation_key"),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("credit_ledger_workspace_idx").on(t.workspaceId),
    uniqueIndex("credit_ledger_operation_unique").on(t.kind, t.operationKey),
  ],
);

/** Reservas ativas: garantem saldo antes do job pago e expiram sozinhas. */
export const creditReservations = pgTable(
  "credit_reservations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(),
    operationKey: text("operation_key").notNull(),
    status: text("status").notNull().default("held"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("credit_reservations_operation_unique").on(t.operationKey),
    index("credit_reservations_workspace_idx").on(t.workspaceId),
  ],
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

// ── Voo Contínuo (experimentos) ──────────────────────────────────────────────

export const experimentStatus = pgEnum("experiment_status", [
  "draft",
  "awaiting_data",
  "ready",
  "running",
  "paused",
  "inconclusive",
  "completed",
  "rolled_back",
]);

export const experiments = pgTable(
  "experiments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    pageId: uuid("page_id")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    status: experimentStatus("status").notNull().default("draft"),
    /** Hipótese em linguagem do usuário: o que se espera e por quê. */
    hypothesis: text("hypothesis").notNull(),
    /** Evento contado como sucesso (ex.: whatsapp_click). */
    goalEvent: text("goal_event").notNull(),
    /** Amostra mínima por variante definida ANTES do início (spec §13.2). */
    minSamplesPerVariant: integer("min_samples_per_variant").notNull(),
    /** Efeito mínimo detectável, em pontos percentuais. */
    minDetectableEffectPp: integer("min_detectable_effect_pp").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    /** Conclusão textual honesta, inclusive "inconclusivo". */
    conclusion: text("conclusion"),
    winnerVariantId: uuid("winner_variant_id"),
    createdBy: uuid("created_by").references(() => profiles.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("experiments_page_idx").on(t.pageId)],
);

export const experimentVariants = pgTable(
  "experiment_variants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    experimentId: uuid("experiment_id")
      .notNull()
      .references(() => experiments.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    /** "control" | "variant" */
    role: text("role").notNull(),
    label: text("label").notNull(),
    /** Versão da página servida nesta variante (imutável). */
    pageVersionId: uuid("page_version_id")
      .notNull()
      .references(() => pageVersions.id),
    exposures: integer("exposures").notNull().default(0),
    conversions: integer("conversions").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("experiment_variants_experiment_idx").on(t.experimentId)],
);

/** Atribuição estável: a mesma sessão vê sempre a mesma variante. */
export const experimentAssignments = pgTable(
  "experiment_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    experimentId: uuid("experiment_id")
      .notNull()
      .references(() => experiments.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => experimentVariants.id, { onDelete: "cascade" }),
    assignmentKey: text("assignment_key").notNull(),
    converted: boolean("converted").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("experiment_assignments_unique").on(
      t.experimentId,
      t.assignmentKey,
    ),
  ],
);

/** Diário de Bordo: relatório mensal idempotente por página/mês. */
export const monthlyReports = pgTable(
  "monthly_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    pageId: uuid("page_id")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    /** AAAA-MM no fuso America/Sao_Paulo. */
    period: text("period").notNull(),
    data: jsonb("data").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("monthly_reports_unique").on(t.pageId, t.period)],
);

// ── Marketplace de profissionais ─────────────────────────────────────────────

export const applicationStatus = pgEnum("application_status", [
  "submitted",
  "approved",
  "rejected",
]);

export const serviceRequestStatus = pgEnum("service_request_status", [
  "open",
  "proposed",
  "contracted",
  "delivered",
  "closed",
  "canceled",
]);

/** Candidatura de profissional — persistida e revisada por admin (spec §15). */
export const professionalApplications = pgTable(
  "professional_applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profileId: uuid("profile_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    specialty: text("specialty").notNull(),
    experience: text("experience").notNull(),
    portfolioUrl: text("portfolio_url"),
    status: applicationStatus("status").notNull().default("submitted"),
    reviewedBy: uuid("reviewed_by").references(() => profiles.id, {
      onDelete: "set null",
    }),
    reviewNote: text("review_note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  },
  (t) => [index("professional_applications_status_idx").on(t.status)],
);

/** Perfil público só existe após aprovação — nunca perfis fictícios. */
export const professionalProfiles = pgTable(
  "professional_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profileId: uuid("profile_id")
      .notNull()
      .unique()
      .references(() => profiles.id, { onDelete: "cascade" }),
    applicationId: uuid("application_id").references(
      () => professionalApplications.id,
      { onDelete: "set null" },
    ),
    displayName: text("display_name").notNull(),
    specialty: text("specialty").notNull(),
    bio: text("bio").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("professional_profiles_active_idx").on(t.active)],
);

export const serviceRequests = pgTable(
  "service_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => profiles.id),
    title: text("title").notNull(),
    description: text("description").notNull(),
    status: serviceRequestStatus("status").notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("service_requests_workspace_idx").on(t.workspaceId)],
);

export const proposals = pgTable(
  "proposals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => serviceRequests.id, { onDelete: "cascade" }),
    professionalId: uuid("professional_id")
      .notNull()
      .references(() => professionalProfiles.id, { onDelete: "cascade" }),
    priceCents: integer("price_cents").notNull(),
    deliveryDays: integer("delivery_days").notNull(),
    scope: text("scope").notNull(),
    accepted: boolean("accepted").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("proposals_request_idx").on(t.requestId),
    // Uma proposta por profissional em cada solicitação.
    uniqueIndex("proposals_unique").on(t.requestId, t.professionalId),
  ],
);

/** Mensagens de contato comercial (/contato e /agencias). */
export const contactMessages = pgTable("contact_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: text("kind").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  company: text("company"),
  message: text("message").notNull(),
  handledAt: timestamp("handled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Integrações externas ─────────────────────────────────────────────────────

export const integrationStatus = pgEnum("integration_status", [
  "not_connected",
  "connected",
  "invalid",
  "degraded",
]);

export const integrationConnections = pgTable(
  "integration_connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    /** "meta_pixel" | "google_analytics" | "rd_station" */
    kind: text("kind").notNull(),
    status: integrationStatus("status").notNull().default("not_connected"),
    /**
     * Config pública (ex.: ID do pixel). Segredos NUNCA voltam em texto puro
     * para a UI — quando existirem, ficam em coluna separada e mascarada.
     */
    config: jsonb("config").notNull(),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("integration_unique").on(t.workspaceId, t.kind)],
);

/** Registro de consentimento do visitante (spec §16: versão + escolha). */
export const consents = pgTable(
  "consents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pageId: uuid("page_id")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    /** Chave pseudônima do visitante; sem PII. */
    visitorKey: text("visitor_key").notNull(),
    analytics: boolean("analytics").notNull(),
    marketing: boolean("marketing").notNull(),
    policyVersion: text("policy_version").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("consents_unique").on(t.pageId, t.visitorKey)],
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
