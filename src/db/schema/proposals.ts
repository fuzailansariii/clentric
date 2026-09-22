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
import { invoices } from "./invoices";

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
    // The rate the tax amount came from. Stored rather than derived so an
    // edit screen can prefill it and the client page can print "Tax (18%)"
    // without dividing money by money.
    taxRate: decimal("tax_rate", { precision: 5, scale: 2 })
      .notNull()
      .default("0"),
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
    /** Optional free text the client may leave when declining. */
    declineReason: text("decline_reason"),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),

    /**
     * Percentage of the total asked for up front, 0 when no deposit is
     * required. Accepting a proposal with a deposit raises an invoice for
     * total x depositPercent / 100 against the freelancer's own payment
     * details — Clentric never handles that money.
     */
    depositPercent: decimal("deposit_percent", { precision: 5, scale: 2 })
      .notNull()
      .default("0"),
    // set null rather than cascade: deleting the deposit invoice must never
    // take the accepted proposal with it.
    depositInvoiceId: uuid("deposit_invoice_id").references(() => invoices.id, {
      onDelete: "set null",
    }),

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
