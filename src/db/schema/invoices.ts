import {
  pgTable,
  pgEnum,
  text,
  decimal,
  timestamp,
  uuid,
  jsonb,
  date,
  index,
  unique,
  integer,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { IssuerSnapshot } from "../../../lib/issuer-snapshot";
import { users } from "./users";
import { clients } from "./clients";
import { projects } from "./projects";

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft",
  "sent",
  "paid",
  "overdue",
]);

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    invoiceNumber: integer("invoice_number").notNull(),
    /**
     * The prefix this invoice was numbered with (users.invoice_prefix at
     * creation), so changing the prefix later never renames old invoices.
     * Printed as `${numberPrefix}${number padded to 3}` — see
     * formatInvoiceNumber.
     */
    numberPrefix: text("number_prefix").notNull().default("INV-"),
    /** Printed at the bottom of the invoice; prefilled from the user's
     * default notes when the invoice is created. */
    notes: text("notes"),
    /**
     * Matches proposals.currency. Without it a deposit invoice raised from a
     * proposal quoted in EUR would render as USD, since formatCurrency has to
     * be told which currency a figure is in.
     */
    currency: text("currency").notNull().default("USD"),
    subTotal: decimal("sub_total", { precision: 12, scale: 2 }).notNull(),
    taxAmount: decimal("tax_amount", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    total: decimal("total", { precision: 12, scale: 2 }).notNull(),
    taxRate: decimal("tax_rate", { precision: 5, scale: 2 })
      .notNull()
      .default("0"),
    issueDate: date("issue_date").notNull(),
    status: invoiceStatusEnum("status").notNull().default("draft"),
    dueDate: date("due_date").notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    paymentDetails: text("payment_details"),
    /**
     * The sender's details as they were when this was sent (see
     * lib/issuer-snapshot.ts). Null for drafts, and for anything sent
     * before snapshots existed — both read live from users instead.
     */
    issuerSnapshot: jsonb("issuer_snapshot").$type<IssuerSnapshot>(),
    /**
     * Set when a client presses "I've sent payment". A nudge and nothing
     * more: it never changes `status`, which only the freelancer's own
     * "Mark as paid" click can do.
     */
    paymentClaimedAt: timestamp("payment_claimed_at", { withTimezone: true }),
    paymentClaimedNote: text("payment_claimed_note"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    lastReminderSentAt: timestamp("last_reminder_sent_at", {
      withTimezone: true,
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_invoices_user_id").on(table.userId),
    index("idx_invoices_client_id").on(table.clientId),
    index("idx_invoices_project_id").on(table.projectId),
    index("idx_invoices_status").on(table.status),
    // Serves the list page: this user's live invoices, newest first.
    // Applied by supabase/migrations/0003_list_indexes.sql.
    index("idx_invoices_user_created")
      .on(table.userId, table.createdAt.desc())
      .where(sql`deleted_at is null`),
    unique("uq_user_invoice_number").on(table.userId, table.invoiceNumber),
  ],
);
