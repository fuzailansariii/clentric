import { sql } from "drizzle-orm";
import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const emailKindEnum = pgEnum("email_kind", [
  "invoice",
  "reminder",
  "proposal",
]);

export const emailSendStatusEnum = pgEnum("email_send_status", [
  "pending",
  "sent",
  "skipped",
  "failed",
]);

/**
 * One row per email sent to a client. The daily limits in lib/email/quota.ts
 * count these rows, so a failed send is marked "failed" and stops counting.
 */
export const emailSends = pgTable(
  "email_sends",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: emailKindEnum("kind").notNull(),
    /** The invoice or proposal the email is about. */
    entityId: uuid("entity_id").notNull(),
    recipient: text("recipient").notNull(),
    status: emailSendStatusEnum("status").notNull().default("pending"),
    /** Resend's email id, once accepted. */
    providerId: text("provider_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_email_sends_entity")
      .on(table.entityId, table.createdAt)
      .where(sql`${table.status} <> 'failed'`),
    index("idx_email_sends_user")
      .on(table.userId, table.createdAt)
      .where(sql`${table.status} <> 'failed'`),
  ],
);
