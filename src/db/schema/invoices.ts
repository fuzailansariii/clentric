import {
  pgTable,
  pgEnum,
  text,
  decimal,
  timestamp,
  uuid,
  date,
  index,
  unique,
  integer,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { clients } from "./clients";
import { projects } from "./projects";

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft",
  "sent",
  "paid",
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
    subTotal: decimal("sub_total", { precision: 12, scale: 2 }).notNull(),
    taxAmount: decimal("tax_amount", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    total: decimal("total", { precision: 12, scale: 2 }).notNull(),
    taxRate: decimal("tax_rate", { precision: 5, scale: 2 }),
    status: invoiceStatusEnum("status").notNull().default("draft"),
    dueDate: date("due_date"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    paymentDetails: text("payment_details"),
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
    unique("uq_user_invoice_number").on(table.userId, table.invoiceNumber),
  ],
);
