import {
  boolean,
  check,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";

/** Declaration order is display order on invoices (Postgres sorts enums so). */
export const paymentMethodTypeEnum = pgEnum("payment_method_type", [
  "bank",
  "paypal",
  "wise",
  "upi",
]);

export const userPaymentMethods = pgTable(
  "user_payment_methods",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: paymentMethodTypeEnum("type").notNull(),

    // bank
    accountHolder: text("account_holder"),
    bankName: text("bank_name"),
    accountNumber: text("account_number"),
    /** IFSC / SWIFT / IBAN / sort code — whatever the bank's country uses. */
    routingCode: text("routing_code"),
    // paypal
    paypalEmail: text("paypal_email"),
    // wise
    wiseAccount: text("wise_account"),
    // upi
    upiId: text("upi_id"),

    showOnInvoices: boolean("show_on_invoices").notNull().default(false),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    // One row per method per user; also serves every lookup by user_id.
    unique("uq_user_payment_method_type").on(table.userId, table.type),
    // A method can only be shown once the fields it needs are filled in.
    check(
      "payment_method_set_up_to_show",
      sql`not ${table.showOnInvoices} or case ${table.type}
        when 'bank' then ${table.accountHolder} is not null
          and ${table.bankName} is not null
          and ${table.accountNumber} is not null
          and ${table.routingCode} is not null
        when 'paypal' then ${table.paypalEmail} is not null
        when 'wise' then ${table.wiseAccount} is not null
        when 'upi' then ${table.upiId} is not null
      end`,
    ),
  ],
);

export type UserPaymentMethodRow = typeof userPaymentMethods.$inferSelect;
