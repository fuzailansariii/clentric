ALTER TYPE "public"."invoice_status" ADD VALUE 'overdue';--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "tax_rate" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "tax_rate" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "due_date" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "issue_date" date NOT NULL;