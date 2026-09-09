CREATE TYPE "public"."coupon_kind" AS ENUM('percent', 'fixed');--> statement-breakpoint
CREATE TABLE "coupon_redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coupon_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"discount_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coupon_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coupon_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"status" text DEFAULT 'held' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coupons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"kind" "coupon_kind" NOT NULL,
	"value" integer NOT NULL,
	"plan_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"max_redemptions" integer,
	"once_per_workspace" boolean DEFAULT true NOT NULL,
	"first_purchase_only" boolean DEFAULT false NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coupons_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_reservations" ADD CONSTRAINT "coupon_reservations_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_reservations" ADD CONSTRAINT "coupon_reservations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "coupon_redemptions_order_unique" ON "coupon_redemptions" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "coupon_redemptions_coupon_idx" ON "coupon_redemptions" USING btree ("coupon_id");--> statement-breakpoint
CREATE UNIQUE INDEX "coupon_reservations_order_unique" ON "coupon_reservations" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "coupon_reservations_coupon_idx" ON "coupon_reservations" USING btree ("coupon_id","status");--> statement-breakpoint
CREATE INDEX "coupons_active_idx" ON "coupons" USING btree ("active");