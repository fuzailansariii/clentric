import {
  decimal,
  index,
  integer,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { proposals } from "./proposals";
import { proposalMilestones } from "./proposal-milestones";

export const proposalItems = pgTable(
  "proposal_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    proposalId: uuid("proposal_id")
      .notNull()
      .references(() => proposals.id, { onDelete: "cascade" }),
    /**
     * The milestone this line belongs to. Nullable so proposals written
     * before milestones existed keep their items, and so a proposal can be
     * quoted as a flat list without inventing a milestone for it. Deleting a
     * milestone removes its lines with it.
     */
    milestoneId: uuid("milestone_id").references(() => proposalMilestones.id, {
      onDelete: "cascade",
    }),
    description: text("description").notNull(),
    quantity: decimal("quantity", { precision: 10, scale: 2 })
      .notNull()
      .default("1"),
    rate: decimal("rate", { precision: 12, scale: 2 }).notNull(),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    index("idx_proposal_items_proposal_id").on(table.proposalId),
    index("idx_proposal_items_milestone_id").on(table.milestoneId),
  ],
);
