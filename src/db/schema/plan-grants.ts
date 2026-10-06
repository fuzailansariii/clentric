import {
  check,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { subscriptionPlanEnum } from "./enums";

/**
 * Free access given by the owner, keyed by email so it works before sign-up.
 * Written only by scripts/grant.mts; revoked by setting revoked_at.
 */
export const planGrants = pgTable(
  "plan_grants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    plan: subscriptionPlanEnum("plan").notNull().default("pro"),
    // Null = no end date.
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [
    check("plan_grants_email_lowercase", sql`${table.email} = lower(${table.email})`),
    // One live grant per email; revoked ones stay as history.
    uniqueIndex("plan_grants_email_active")
      .on(table.email)
      .where(sql`${table.revokedAt} is null`),
  ],
);
