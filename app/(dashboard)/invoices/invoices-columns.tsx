import type { Column } from "@/components/data-table/data-table.types";
import { formatDate } from "@/lib/format-date";
import { formatCurrency } from "@/lib/format-currency";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import { invoiceStatusConfig } from "./invoice-status-config";
import { InvoiceRowActions } from "./invoice-row-actions";
import { InvoiceListItem } from "./queries";
import { formatInvoiceNumber } from "@/lib/format-invoice-number";

export const invoiceColumns: Column<InvoiceListItem>[] = [
  {
    header: "Invoice",
    className: "min-w-[9rem] max-w-[14rem]",
    cell: (row) => (
      <div className="min-w-0">
        <div className="truncate font-medium">
          {formatInvoiceNumber(row.invoiceNumber)}
        </div>
        <div className="text-muted-foreground truncate text-xs">
          {row.projectTitle ?? "—"}
        </div>
      </div>
    ),
  },
  {
    header: "Client",
    hideBelow: "md",
    className: "min-w-[7rem] max-w-[11rem]",
    cell: (row) => (
      <span className="block truncate">{row.clientName ?? "—"}</span>
    ),
  },
  {
    header: "Status",
    className: "w-[1%] whitespace-nowrap",
    cell: (row) => {
      const config = invoiceStatusConfig[row.status];
      return (
        <StatusBadge
          status={config.variant}
          className={config.dim ? "opacity-60" : undefined}
        >
          {config.label}
        </StatusBadge>
      );
    },
  },
  {
    header: "Amount",
    accessorKey: "total",
    className: "whitespace-nowrap",
    cell: (row) => formatCurrency(row.total),
  },
  {
    header: "Issued",
    accessorKey: "issueDate",
    hideBelow: "lg",
    className: "whitespace-nowrap",
    cell: (row) => formatDate(row.issueDate),
  },
  {
    header: "Due",
    accessorKey: "dueDate",
    hideBelow: "xl",
    className: "whitespace-nowrap",
    cell: (row) => (
      <span
        className={cn(row.status === "overdue" && "font-medium text-rose-500")}
      >
        {formatDate(row.dueDate)}
      </span>
    ),
  },
  {
    header: "Actions",
    className: "w-[1%] whitespace-nowrap text-right",
    cell: (row) => <InvoiceRowActions invoice={row} />,
  },
];
