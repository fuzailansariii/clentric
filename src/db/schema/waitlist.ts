import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const waitlistSourceEnum = pgEnum("waitlist_source", [
  "x",
  "reddit",
  "direct",
  "other",
]);

export const waitlistEmails = pgTable("waitlist_emails", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  source: waitlistSourceEnum("source").default("direct"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
});
