import { pgTable, text, timestamp, uuid, boolean } from "drizzle-orm/pg-core";
import { authUsers } from "drizzle-orm/supabase";
import { subscriptionPlanEnum } from "./enums";

export const users = pgTable("users", {
  id: uuid("id")
    .primaryKey()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  email: text("email").notNull().unique(),
  name: text("name"),
  avatar: text("avatar"),
  profession: text("profession"),
  plan: subscriptionPlanEnum("plan").notNull().default("free"),
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
  timezone: text("timezone").default("UTC"),
  /** Hex colour used for the branding strip on public proposal pages. */
  brandColor: text("brand_color"),
  /**
   * Bank / PayPal / Wise details, free text, copied onto invoices this user
   * raises. Never card data, and never sent to a payment provider — clients
   * pay the freelancer directly, outside the app.
   */
  paymentDetails: text("payment_details"),
  /** Optional quote shown on public proposal pages. */
  testimonialQuote: text("testimonial_quote"),
  testimonialAuthor: text("testimonial_author"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});
