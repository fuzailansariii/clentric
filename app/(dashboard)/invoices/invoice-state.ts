import type { StatusTone } from "@/components/ui/status-badge";
import { formatDaysUntilDue, formatShortDate } from "@/lib/format-due";
import type { InvoiceDisplayStatus } from "@/lib/get-invoice-display-status";

/** What the invoice list shows: the display status plus the client's claim. */
export type InvoiceState = "draft" | "pending" | "overdue" | "claimed" | "paid";

export const invoiceStateConfig: Record<
  InvoiceState,
  { label: string; tone: StatusTone }
> = {
  draft: { label: "Draft", tone: "neutral" },
  pending: { label: "Pending", tone: "info" },
  overdue: { label: "Overdue", tone: "danger" },
  claimed: { label: "Client says paid", tone: "warning" },
  paid: { label: "Paid", tone: "success" },
};

export function invoiceState(invoice: {
  status: InvoiceDisplayStatus;
  paymentClaimedAt: Date | null;
}): InvoiceState {
  if (invoice.status === "draft" || invoice.status === "paid") {
    return invoice.status;
  }
  if (invoice.paymentClaimedAt) return "claimed";
  return invoice.status === "overdue" ? "overdue" : "pending";
}

/** "Not sent", "Due in 4 days", "3 days late", "Client says paid · Oct 11", "Paid Oct 2". */
export function invoiceNote(
  state: InvoiceState,
  invoice: {
    daysUntilDue: number;
    paidAt: Date | null;
    paymentClaimedAt: Date | null;
  },
): string {
  switch (state) {
    case "draft":
      return "Not sent";
    case "paid":
      return invoice.paidAt
        ? `Paid ${formatShortDate(invoice.paidAt)}`
        : "Paid";
    case "claimed":
      return `Client says paid · ${formatShortDate(invoice.paymentClaimedAt!)}`;
    default:
      return formatDaysUntilDue(invoice.daysUntilDue);
  }
}
