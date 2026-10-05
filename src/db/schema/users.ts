import {
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  integer,
  decimal,
  check,
  pgEnum,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { authUsers } from "drizzle-orm/supabase";
import { subscriptionPlanEnum } from "./enums";

export const invoiceTemplateEnum = pgEnum("invoice_template", [
  "classic",
  "modern",
]);

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
    /** @deprecated Never read it: the plan comes from getEffectivePlan() in lib/billing. */
    plan: subscriptionPlanEnum("plan").notNull().default("free"),
    onboardingCompleted: boolean("onboarding_completed")
      .notNull()
      .default(false),
    timezone: text("timezone").default("UTC"),
    brandColor: text("brand_color"),
    logoUrl: text("logo_url"),
    logoFileId: text("logo_file_id"),
    logoUpdatedAt: timestamp("logo_updated_at", { withTimezone: true }),
    paymentDetails: text("payment_details"),
    testimonialQuote: text("testimonial_quote"),
    testimonialAuthor: text("testimonial_author"),
    businessName: text("business_name"),
    businessEmail: text("business_email"),
    website: text("website"),
    phone: text("phone"),
    taxId: text("tax_id"),
    address: text("address"),
    country: text("country"),
    invoicePrefix: text("invoice_prefix").notNull().default("INV-"),
    invoiceTemplate: invoiceTemplateEnum("invoice_template")
      .notNull()
      .default("classic"),
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
    check(
      "users_brand_color_format",
      sql`${table.brandColor} is null or ${table.brandColor} ~ '^#[0-9a-f]{6}$'`,
    ),
    check(
      "users_testimonial_length",
      sql`char_length(${table.testimonialQuote}) <= 300 and char_length(${table.testimonialAuthor}) <= 80`,
    ),
    // Both set or both empty: a URL without its id could never be deleted.
    check(
      "users_logo_pair",
      sql`(${table.logoUrl} is null) = (${table.logoFileId} is null)`,
    ),
  ],
);
