import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  uuid,
  decimal,
  date,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
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
    /**
     * Matches proposals.currency. Without it a project created from a EUR
     * proposal would render its budget with a dollar sign.
     */
    currency: text("currency").notNull().default("USD"),
    /**
     * Set when this project was created by accepting a proposal. The project
     * remembers where it came from; proposals deliberately do not point back.
     *
     * No .references() here on purpose: proposals already references invoices
     * (deposit_invoice_id) and invoices references projects, so pointing this
     * at proposals in TypeScript closes the loop
     * invoices -> projects -> proposals -> invoices and breaks Drizzle's
     * relational type inference. The real foreign key, with ON DELETE SET
     * NULL, is added in the hand-written projects-proposal-fk.sql instead.
     */
    proposalId: uuid("proposal_id"),
    // Optional; overrides the client's hourly rate when prefilling invoices.
    // Applied by supabase/migrations/0004_hourly_billing.sql (> 0 CHECK).
    hourlyRate: decimal("hourly_rate", { precision: 12, scale: 2 }),
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
    // Serves the list page: this user's live projects, newest first.
    // Applied by supabase/migrations/0003_list_indexes.sql.
    index("idx_projects_user_created")
      .on(table.userId, table.createdAt.desc())
      .where(sql`deleted_at is null`),
    index("idx_projects_proposal_id").on(table.proposalId),
    // One live project per proposal, enforced by the database rather than by
    // application logic alone - two tabs accepting at once cannot both win.
    // Soft-deleting a project frees its proposal to be started again.
    uniqueIndex("uq_projects_proposal_live")
      .on(table.proposalId)
      .where(sql`proposal_id is not null and deleted_at is null`),
  ],
);

export type ProjectRow = typeof projects.$inferSelect;
