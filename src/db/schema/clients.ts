import {
  decimal,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";

export const clientStatusEnum = pgEnum("client_status", [
  "lead",
  "active",
  "inactive",
  "archived",
]);

export const clients = pgTable(
  "clients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    company: text("company"),
    country: text("country"),
    status: clientStatusEnum("status").default("active").notNull(),
    notes: text("notes"),
    // Optional default for hour lines on this client's invoices. Applied by
    // supabase/migrations/0004_hourly_billing.sql (with a > 0 CHECK).
    hourlyRate: decimal("hourly_rate", { precision: 12, scale: 2 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_clients_user_id").on(table.userId),
    // Serves the list page: this user's live clients, newest first.
    // Applied by supabase/migrations/0003_list_indexes.sql.
    index("idx_clients_user_created")
      .on(table.userId, table.createdAt.desc())
      .where(sql`deleted_at is null`),
  ],
);

export type ClientRow = typeof clients.$inferSelect;
