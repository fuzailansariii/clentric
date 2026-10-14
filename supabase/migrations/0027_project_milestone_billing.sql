CREATE TYPE "public"."project_billing" AS ENUM('per_milestone', 'end');--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "start_date" date;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "billing" "project_billing" DEFAULT 'per_milestone' NOT NULL;--> statement-breakpoint
ALTER TABLE "milestones" ADD COLUMN "amount" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "invoice_items" ADD COLUMN "milestone_id" uuid;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_milestone_id_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."milestones"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_invoice_items_milestone_id" ON "invoice_items" USING btree ("milestone_id");--> statement-breakpoint
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_amount_nonnegative" CHECK ("amount" IS NULL OR "amount" >= 0);--> statement-breakpoint
-- Projects started from a proposal: each milestone takes its stage's price (same name, same order).
WITH stage AS (
  SELECT pm.proposal_id, pm.name,
    row_number() OVER (PARTITION BY pm.proposal_id ORDER BY pm.sort_order, pm.id) - 1 AS idx,
    (SELECT coalesce(sum(pi.amount), 0) FROM proposal_items pi WHERE pi.milestone_id = pm.id) AS total
  FROM proposal_milestones pm
), ms AS (
  SELECT m.id, m.title, p.proposal_id,
    row_number() OVER (PARTITION BY m.project_id ORDER BY m.sort_order, m.id) - 1 AS idx
  FROM milestones m JOIN projects p ON p.id = m.project_id
  WHERE p.proposal_id IS NOT NULL
)
UPDATE milestones m SET amount = stage.total
FROM ms JOIN stage ON stage.proposal_id = ms.proposal_id AND stage.idx = ms.idx AND stage.name = ms.title
WHERE m.id = ms.id AND m.amount IS NULL;
