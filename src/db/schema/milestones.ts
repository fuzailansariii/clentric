import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgEnum,
  date,
  index,
  integer,
} from "drizzle-orm/pg-core";
import { projects } from "./projects";

export const milestoneStatusEnum = pgEnum("milestone_status", [
  "pending",
  "completed",
]);

export const milestones = pgTable(
  "milestones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, {
        onDelete: "cascade",
      }),
    title: text("title").notNull(),
    status: milestoneStatusEnum("status").notNull().default("pending"),
    dueDate: date("due_date"),
    /**
     * Explicit ordering. Milestones created in one statement share an
     * identical createdAt, so ordering by timestamp alone falls back to a
     * random uuid tiebreak - which scrambled stages copied from a proposal.
     */
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_milestones_project_id").on(table.projectId)],
);
