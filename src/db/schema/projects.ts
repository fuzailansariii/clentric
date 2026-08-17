import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  uuid,
  decimal,
  date,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { clients } from "./clients";

export const projectStatusEnum = pgEnum("project_status_enum", [
  "not_started",
  "in_progress",
  "on_hold",
  "completed",
]);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    description: text("description"),
    budget: decimal("budget", { precision: 12, scale: 2 }).notNull(),
    deadline: date("deadline"),
    status: projectStatusEnum("status").notNull().default("not_started"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_projects_user_id").on(table.userId),
    index("idx_project_client_id").on(table.clientId),
  ],
);

export type ProjectRow = typeof projects.$inferSelect;
