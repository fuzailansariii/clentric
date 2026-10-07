CREATE TYPE "public"."email_kind" AS ENUM('invoice', 'reminder', 'proposal');--> statement-breakpoint
CREATE TYPE "public"."email_send_status" AS ENUM('pending', 'sent', 'skipped', 'failed');--> statement-breakpoint
CREATE TABLE "email_sends" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" "email_kind" NOT NULL,
	"entity_id" uuid NOT NULL,
	"recipient" text NOT NULL,
	"status" "email_send_status" DEFAULT 'pending' NOT NULL,
	"provider_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "email_sends" ADD CONSTRAINT "email_sends_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_email_sends_entity" ON "email_sends" USING btree ("entity_id","created_at") WHERE "email_sends"."status" <> 'failed';--> statement-breakpoint
CREATE INDEX "idx_email_sends_user" ON "email_sends" USING btree ("user_id","created_at") WHERE "email_sends"."status" <> 'failed';--> statement-breakpoint
-- Read-only for the owner; only the server writes, like activity_logs.
ALTER TABLE "email_sends" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "users_view_own_email_sends" ON "email_sends" FOR SELECT USING (auth.uid() = "user_id");
