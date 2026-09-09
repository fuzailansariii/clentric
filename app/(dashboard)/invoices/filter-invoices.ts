import type { InvoiceListItem } from "./queries";
import type { InvoiceStatus } from "./invoice-status-config";

export function filterInvoices(
  invoices: InvoiceListItem[],
  search: string,
  status: InvoiceStatus | "all",
): InvoiceListItem[] {
  const query = search.trim().toLowerCase();

  return invoices.filter((invoice) => {
    if (status !== "all" && invoice.status !== status) return false;
    if (!query) return true;

    const haystack = [
      String(invoice.invoiceNumber),
      invoice.projectTitle ?? "",
      invoice.clientName ?? "",
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
}
