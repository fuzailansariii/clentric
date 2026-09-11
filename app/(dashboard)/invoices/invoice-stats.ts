import type { InvoiceListItem } from "./queries";

export type InvoiceStats = {
  totalCount: number;
  total: number;
  paidCount: number;
  paid: number;
  outstandingCount: number;
  outstanding: number;
  overdueCount: number;
  overdue: number;
  draftCount: number;
  draft: number;
};

export function computeInvoiceStats(invoices: InvoiceListItem[]): InvoiceStats {
  let totalCount = 0;
  let total = 0;
  let paidCount = 0;
  let paid = 0;
  let outstandingCount = 0;
  let outstanding = 0;
  let overdueCount = 0;
  let overdue = 0;
  let draftCount = 0;
  let draft = 0;

  for (const invoice of invoices) {
    const amount = Number(invoice.total);

    totalCount++;
    total += amount;

    if (invoice.status === "paid") {
      paidCount++;
      paid += amount;
    } else if (invoice.status === "draft") {
      draftCount++;
      draft += amount;
    } else if (invoice.status === "overdue") {
      overdueCount++;
      overdue += amount;
    } else {
      // sent, not overdue
      outstandingCount++;
      outstanding += amount;
    }
  }

  return {
    totalCount,
    total,
    paidCount,
    paid,
    outstandingCount,
    outstanding,
    overdueCount,
    overdue,
    draftCount,
    draft,
  };
}
