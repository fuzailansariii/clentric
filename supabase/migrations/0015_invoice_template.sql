CREATE TYPE "public"."invoice_template" AS ENUM('classic', 'modern');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "invoice_template" "invoice_template" DEFAULT 'classic' NOT NULL;