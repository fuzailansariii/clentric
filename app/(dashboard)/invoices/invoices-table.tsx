"use client";
import { DataTable } from "@/components/data-table/data-table";
import { invoiceColumns } from "./invoices-columns";
import { renderInvoiceMobileCard } from "./render-invoice-mobile-card";
import type { InvoiceListItem } from "./queries";

export function InvoicesTable({ data }: { data: InvoiceListItem[] }) {
  return (
    <DataTable
      data={data}
      columns={invoiceColumns}
      renderMobileCard={renderInvoiceMobileCard}
      getRowId={(row) => row.id}
      emptyMessage="No invoices yet."
    />
  );
}
