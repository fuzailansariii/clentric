import { formatDaysUntilDue, formatShortDate } from "@/lib/format-due";
import type { InvoiceListItem } from "./queries";

/** "Due in 9 days", "20 days late", "Paid Sep 11", "Not sent yet". */
export function getInvoiceDueLabel(
  invoice: Pick<InvoiceListItem, "status" | "daysUntilDue" | "paidAt">,
): { label: string; late: boolean } {
  switch (invoice.status) {
    case "draft":
      return { label: "Not sent yet", late: false };

    case "paid":
      return {
        label: invoice.paidAt
          ? `Paid ${formatShortDate(invoice.paidAt)}`
          : "Paid",
        late: false,
      };

    case "overdue":
      return { label: formatDaysUntilDue(invoice.daysUntilDue), late: true };

    default:
      return { label: formatDaysUntilDue(invoice.daysUntilDue), late: false };
  }
}
