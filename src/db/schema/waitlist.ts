import {
  boolean,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

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
  // Joined from the Agency card. A flag rather than a source value, so an
  // existing signup keeps the source it came from.
  interestedInAgency: boolean("interested_in_agency").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
});
