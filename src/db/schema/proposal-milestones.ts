import { index, integer, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { proposals } from "./proposals";

/**
 * A named stage inside a proposal, grouping the line items that belong to it
 * ("Discovery", "Build", "Handover").
 *
 * Deliberately separate from the `milestones` table: that one hangs off a
 * project and tracks delivery progress with a status and a due date. This one
 * exists only to group a quote's line items while the client is still
 * deciding, and is cascade-deleted with its proposal.
 */
export const proposalMilestones = pgTable(
  "proposal_milestones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    proposalId: uuid("proposal_id")
      .notNull()
      .references(() => proposals.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    index("idx_proposal_milestones_proposal_id").on(table.proposalId),
  ],
);

export type ProposalMilestoneRow = typeof proposalMilestones.$inferSelect;
