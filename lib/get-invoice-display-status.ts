import type { invoices } from "@/src/db/schema/invoices";

type Invoice = typeof invoices.$inferSelect;

export type InvoiceDisplayStatus = "draft" | "sent" | "paid" | "overdue";

export function getDisplayStatus(
  invoice: Invoice,
  today: string = new Date().toISOString().slice(0, 10),
): InvoiceDisplayStatus {
  if (invoice.status === "sent" && invoice.dueDate < today) {
    return "overdue";
  }

  return invoice.status;
}
