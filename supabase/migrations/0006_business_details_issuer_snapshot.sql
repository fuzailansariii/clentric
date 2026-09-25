ALTER TABLE "users" ADD COLUMN "business_name" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "website" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "tax_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "issuer_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "issuer_snapshot" jsonb;