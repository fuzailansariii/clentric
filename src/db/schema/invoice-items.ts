import {
  pgEnum,
  pgTable,
  text,
  decimal,
  uuid,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { invoices } from "./invoices";

// What a line's quantity counts. Applied by
// supabase/migrations/0004_hourly_billing.sql.
export const invoiceItemUnitEnum = pgEnum("invoice_item_unit", [
  "item",
  "hour",
  "day",
]);

export type InvoiceItemUnit = (typeof invoiceItemUnitEnum.enumValues)[number];

export const invoiceItems = pgTable(
  "invoice_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    quantity: decimal("quantity", { precision: 10, scale: 2 })
      .notNull()
      .default("1"),
    rate: decimal("rate", { precision: 12, scale: 2 }).notNull(),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    unit: invoiceItemUnitEnum("unit").notNull().default("item"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [index("idx_invoice_items_invoice_id").on(table.invoiceId)],
);
