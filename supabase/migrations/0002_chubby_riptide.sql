CREATE TABLE "proposal_milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proposal_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "brand_color" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "payment_details" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "testimonial_quote" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "testimonial_author" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "payment_claimed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "payment_claimed_note" text;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "tax_rate" numeric(5, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "decline_reason" text;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "deposit_percent" numeric(5, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "deposit_invoice_id" uuid;--> statement-breakpoint
ALTER TABLE "proposal_items" ADD COLUMN "milestone_id" uuid;--> statement-breakpoint
ALTER TABLE "proposal_milestones" ADD CONSTRAINT "proposal_milestones_proposal_id_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_proposal_milestones_proposal_id" ON "proposal_milestones" USING btree ("proposal_id");--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_deposit_invoice_id_invoices_id_fk" FOREIGN KEY ("deposit_invoice_id") REFERENCES "public"."invoices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_items" ADD CONSTRAINT "proposal_items_milestone_id_proposal_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."proposal_milestones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_proposal_items_milestone_id" ON "proposal_items" USING btree ("milestone_id");