import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgEnum,
  date,
  index,
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
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_milestones_project_id").on(table.projectId)],
);
