ALTER TABLE "proposals" ADD COLUMN "delivery_days" integer;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_delivery_days_range" CHECK ("delivery_days" IS NULL OR "delivery_days" BETWEEN 1 AND 365);
