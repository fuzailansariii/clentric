CREATE TYPE "public"."project_pricing" AS ENUM('fixed', 'hourly');--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "pricing" "project_pricing" DEFAULT 'fixed' NOT NULL;