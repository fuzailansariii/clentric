"use client";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/data-table/data-table";
import { invoiceColumns } from "./invoices-columns";
import { renderInvoiceMobileCard } from "./render-invoice-mobile-card";
import { formatInvoiceNumber } from "@/lib/format-invoice-number";
import type { InvoiceListItem } from "./queries";

export function InvoicesTable({
  data,
  toolbar,
  footer,
  className,
}: {
  data: InvoiceListItem[];
  toolbar?: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  const router = useRouter();

  return (
    <DataTable
      data={data}
      columns={invoiceColumns}
      renderMobileCard={renderInvoiceMobileCard}
      getRowId={(row) => row.id}
      getRowAriaLabel={(row) =>
        `View invoice ${formatInvoiceNumber(row.invoiceNumber)}`
      }
      onRowClick={(row) => router.push(`/invoices/${row.id}`)}
      emptyMessage="No invoices found."
      toolbar={toolbar}
      footer={footer}
      className={className}
    />
  );
}
