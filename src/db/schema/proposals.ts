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
import { clients } from "./clients";

export const proposalStatusEnum = pgEnum("proposal_status", [
  "draft",
  "sent",
  "viewed",
  "accepted",
  "rejected",
  "revoked",
  "expired",
]);

export const proposals = pgTable(
  "proposals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),

    title: text("title").notNull(),
    content: text("content"),

    // Money — mirrors the invoice module's format exactly.
    currency: text("currency").notNull().default("USD"),
    subtotal: decimal("subtotal", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    tax: decimal("tax", { precision: 12, scale: 2 }).notNull().default("0"),
    total: decimal("total", { precision: 12, scale: 2 }).notNull().default("0"),

    status: proposalStatusEnum("status").notNull().default("draft"),

    // Public, no-login shareable link. Generated in application code
    // (crypto.randomBytes(32).toString('base64url')) — never derived from id.
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),

    // Lifecycle timestamps
    viewedAt: timestamp("viewed_at", { withTimezone: true }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_proposals_user_id").on(table.userId),
    index("idx_proposals_client_id").on(table.clientId),
    index("idx_proposals_token").on(table.token),
    // Serves the dashboard: this user's live proposals, newest first.
    index("idx_proposals_user_created")
      .on(table.userId, table.createdAt.desc())
      .where(sql`deleted_at is null`),
    // Serves status-filtered views (e.g. "show me all Sent proposals").
    index("idx_proposals_user_status")
      .on(table.userId, table.status)
      .where(sql`deleted_at is null`),
  ],
);

export type ProposalRow = typeof proposals.$inferSelect;
