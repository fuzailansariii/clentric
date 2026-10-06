import { check, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * Who may create an account during the beta. Checked by Supabase's
 * before-user-created hook (migration 0023); written only by scripts/invite.mts.
 */
export const betaInvites = pgTable(
  "beta_invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull().unique(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("beta_invites_email_lowercase", sql`${table.email} = lower(${table.email})`),
  ],
);
