import {
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  integer,
  decimal,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { authUsers } from "drizzle-orm/supabase";
import { subscriptionPlanEnum } from "./enums";

export const users = pgTable(
  "users",
  {
    id: uuid("id")
      .primaryKey()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    email: text("email").notNull().unique(),
    name: text("name"),
    avatar: text("avatar"),
    profession: text("profession"),
    plan: subscriptionPlanEnum("plan").notNull().default("free"),
    onboardingCompleted: boolean("onboarding_completed")
      .notNull()
      .default(false),
    timezone: text("timezone").default("UTC"),
    /** Hex colour used for the branding strip on public proposal pages. */
    brandColor: text("brand_color"),
    /**
     * "Other payment instructions": free text printed under the payment
     * methods (user_payment_methods) on invoices. Never card data, and never
     * sent to a payment provider — clients pay the freelancer directly,
     * outside the app. Kept under its original column name so existing
     * details carried over without a data migration.
     */
    paymentDetails: text("payment_details"),
    /** Optional quote shown on public proposal pages. */
    testimonialQuote: text("testimonial_quote"),
    testimonialAuthor: text("testimonial_author"),
    /**
     * Business details printed on invoices and proposals. Documents read
     * these live while they are drafts; sending copies them into the
     * document's issuer_snapshot so later edits never change what a client
     * received.
     */
    businessName: text("business_name"),
    /**
     * Where clients should write to about invoices and proposals. Printed in
     * place of the sign-in email when set; null falls back to `email`.
     */
    businessEmail: text("business_email"),
    /** Normalized to a full https:// URL on save. */
    website: text("website"),
    /** Dial code then number, e.g. "+44 2071234567" — same as clients.phone. */
    phone: text("phone"),
    taxId: text("tax_id"),
    address: text("address"),

    /**
     * Invoice & proposal defaults. New invoices and proposals start from
     * these; existing ones never change. The next invoice *number* lives in
     * invoice_counters, which owns numbering.
     */
    invoicePrefix: text("invoice_prefix").notNull().default("INV-"),
    /** Days from issue to due date: 0 (on receipt), 7, 14 or 30. */
    paymentTermsDays: integer("payment_terms_days").notNull().default(14),
    defaultTaxRate: decimal("default_tax_rate", { precision: 5, scale: 2 })
      .notNull()
      .default("0"),
    defaultInvoiceNotes: text("default_invoice_notes"),
    defaultProposalExpiryDays: integer("default_proposal_expiry_days")
      .notNull()
      .default(14),
    defaultDepositPercent: decimal("default_deposit_percent", {
      precision: 5,
      scale: 2,
    })
      .notNull()
      .default("0"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    /**
     * Set when the user asks to delete their account. For the next 30 days
     * the account is locked (requireUser refuses it, public links close)
     * but restorable by signing in; after that it is purged. See
     * ACCOUNT_DELETION_GRACE_DAYS in lib/account-deletion.ts.
     */
    deletionRequestedAt: timestamp("deletion_requested_at", {
      withTimezone: true,
    }),
  },
  (table) => [
    check(
      "users_invoice_prefix_format",
      sql`${table.invoicePrefix} ~ '^[A-Za-z0-9-]{1,10}$'`,
    ),
    check(
      "users_payment_terms_days_allowed",
      sql`${table.paymentTermsDays} in (0, 7, 14, 30)`,
    ),
    check(
      "users_default_tax_rate_range",
      sql`${table.defaultTaxRate} between 0 and 100`,
    ),
    check(
      "users_default_proposal_expiry_days_range",
      sql`${table.defaultProposalExpiryDays} between 1 and 90`,
    ),
    check(
      "users_default_deposit_percent_range",
      sql`${table.defaultDepositPercent} between 0 and 100`,
    ),
  ],
);
