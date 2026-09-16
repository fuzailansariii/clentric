ALTER TYPE "public"."proposal_status" ADD VALUE 'revoked';--> statement-breakpoint
ALTER TYPE "public"."proposal_status" ADD VALUE 'expired';--> statement-breakpoint
DROP INDEX "idx_proposals_user_id ";--> statement-breakpoint
ALTER TABLE "proposals" ALTER COLUMN "total" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "proposals" ALTER COLUMN "total" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "currency" text DEFAULT 'USD' NOT NULL;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "subtotal" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "tax" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "token" text NOT NULL;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "revoked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "idx_proposals_user_id" ON "proposals" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_proposals_token" ON "proposals" USING btree ("token");--> statement-breakpoint
CREATE INDEX "idx_proposals_user_created" ON "proposals" USING btree ("user_id","created_at" DESC NULLS LAST) WHERE deleted_at is null;--> statement-breakpoint
CREATE INDEX "idx_proposals_user_status" ON "proposals" USING btree ("user_id","status") WHERE deleted_at is null;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_token_unique" UNIQUE("token");