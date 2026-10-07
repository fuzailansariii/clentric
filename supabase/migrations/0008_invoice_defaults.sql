ALTER TABLE "users" ADD COLUMN "invoice_prefix" text DEFAULT 'INV-' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "payment_terms_days" integer DEFAULT 14 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "default_tax_rate" numeric(5, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "default_invoice_notes" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "default_proposal_expiry_days" integer DEFAULT 14 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "default_deposit_percent" numeric(5, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "number_prefix" text DEFAULT 'INV-' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_invoice_prefix_format" CHECK ("users"."invoice_prefix" ~ '^[A-Za-z0-9-]{1,10}$');--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_payment_terms_days_allowed" CHECK ("users"."payment_terms_days" in (0, 7, 14, 30));--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_default_tax_rate_range" CHECK ("users"."default_tax_rate" between 0 and 100);--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_default_proposal_expiry_days_range" CHECK ("users"."default_proposal_expiry_days" between 1 and 90);--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_default_deposit_percent_range" CHECK ("users"."default_deposit_percent" between 0 and 100);