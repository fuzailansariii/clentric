-- Was only in a hand-run SQL file (now in 0022); a fresh database needs it here.
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text DEFAULT 'dodo' NOT NULL,
	"customer_id" text,
	"subscription_id" text,
	"product_id" text,
	"interval" text,
	"status" text,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"current_period_end" timestamp with time zone,
	"last_event_at" timestamp with time zone,
	"checkout_started_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "subscriptions_customer_id_unique" UNIQUE("customer_id"),
	CONSTRAINT "subscriptions_subscription_id_unique" UNIQUE("subscription_id"),
	CONSTRAINT "subscriptions_interval_allowed" CHECK ("subscriptions"."interval" is null or "subscriptions"."interval" in ('monthly', 'yearly')),
	CONSTRAINT "subscriptions_status_allowed" CHECK ("subscriptions"."status" is null or "subscriptions"."status" in ('pending', 'active', 'past_due', 'on_hold', 'paused', 'cancelled', 'expired', 'failed'))
);
--> statement-breakpoint
CREATE TABLE "plan_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"plan" "subscription_plan" DEFAULT 'pro' NOT NULL,
	"expires_at" timestamp with time zone,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "plan_grants_email_lowercase" CHECK ("plan_grants"."email" = lower("plan_grants"."email"))
);
--> statement-breakpoint
ALTER TABLE "webhook_events" ALTER COLUMN "provider" SET DEFAULT 'dodo';--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "plan_grants_email_active" ON "plan_grants" USING btree ("email") WHERE "plan_grants"."revoked_at" is null;--> statement-breakpoint
CREATE TRIGGER "trg_subscriptions_updated_at" BEFORE UPDATE ON "subscriptions" FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
-- Billing is read-only for the owner; only the server and the webhook write.
ALTER TABLE "subscriptions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "users_view_own_subscription" ON "subscriptions" FOR SELECT USING (auth.uid() = "user_id");--> statement-breakpoint
-- Grants are server-only: RLS on, no policies.
ALTER TABLE "plan_grants" ENABLE ROW LEVEL SECURITY;