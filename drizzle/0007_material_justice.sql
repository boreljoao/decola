CREATE TYPE "public"."domain_status" AS ENUM('pending_verification', 'verified', 'ssl_pending', 'active', 'failed', 'detached');--> statement-breakpoint
CREATE TABLE "domains" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"page_id" uuid NOT NULL,
	"host" text NOT NULL,
	"status" "domain_status" DEFAULT 'pending_verification' NOT NULL,
	"verification_token" text NOT NULL,
	"last_checked_at" timestamp with time zone,
	"last_error" text,
	"verified_at" timestamp with time zone,
	"activated_at" timestamp with time zone,
	"detached_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "domains" ADD CONSTRAINT "domains_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "domains" ADD CONSTRAINT "domains_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "domains_host_unique" ON "domains" USING btree ("host");--> statement-breakpoint
CREATE INDEX "domains_page_idx" ON "domains" USING btree ("page_id");