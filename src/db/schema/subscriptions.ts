import {
  boolean,
  check,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";

/**
 * One billing row per user, provider-neutral. Created when checkout starts
 * (customer id, cooldown); everything else is written only by the webhook.
 */
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").notNull().default("dodo"),
    customerId: text("customer_id").unique(),
    subscriptionId: text("subscription_id").unique(),
    productId: text("product_id"),
    interval: text("interval"),
    status: text("status"),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    // Newest provider event applied; older events arriving late are ignored.
    lastEventAt: timestamp("last_event_at", { withTimezone: true }),
    checkoutStartedAt: timestamp("checkout_started_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "subscriptions_interval_allowed",
      sql`${table.interval} is null or ${table.interval} in ('monthly', 'yearly')`,
    ),
    check(
      "subscriptions_status_allowed",
      sql`${table.status} is null or ${table.status} in ('pending', 'active', 'past_due', 'on_hold', 'paused', 'cancelled', 'expired', 'failed')`,
    ),
  ],
);
