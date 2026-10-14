ALTER TABLE "projects" ADD COLUMN "completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "proposal_milestones" ADD COLUMN "timeframe" text;--> statement-breakpoint
ALTER TABLE "proposal_milestones" ADD CONSTRAINT "proposal_milestones_timeframe_length" CHECK ("timeframe" IS NULL OR char_length("timeframe") <= 60);--> statement-breakpoint
-- Projects already completed: best known delivery date is their last update.
UPDATE "projects" SET "completed_at" = "updated_at" WHERE "status" = 'completed' AND "completed_at" IS NULL;
