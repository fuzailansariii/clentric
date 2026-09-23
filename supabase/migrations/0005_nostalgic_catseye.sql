ALTER TABLE "projects" ADD COLUMN "currency" text DEFAULT 'USD' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "proposal_id" uuid;--> statement-breakpoint
ALTER TABLE "milestones" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_projects_proposal_id" ON "projects" USING btree ("proposal_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_projects_proposal_live" ON "projects" USING btree ("proposal_id") WHERE proposal_id is not null and deleted_at is null;