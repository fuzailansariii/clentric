import { FileTextIcon } from "lucide-react";
import type { Column } from "@/components/data-table/data-table.types";
import { RowIdentity } from "@/components/data-table/row-parts";
import { IconTile } from "@/components/ui/icon-tile";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/format-date";
import { formatCurrency } from "@/lib/format-currency";
import { formatInvoiceNumber } from "@/lib/format-invoice-number";
import { cn } from "@/lib/utils";
import { getInvoiceDueLabel } from "./invoice-due-label";
import { InvoiceRowActions } from "./invoice-row-actions";
import { invoiceAmountColor, invoiceStatusConfig } from "./invoice-status-config";
import type { InvoiceListItem } from "./queries";

// Visibility by table width — always: Invoice (with client underneath),
// Status, Amount · 720px+: Due · 860px+: Issued · 1000px+: Project. Amount
// is never hidden: this is billing software, it's the figure people scan for.
export const invoiceColumns: Column<InvoiceListItem>[] = [
  {
    header: "Invoice",
    className: "min-w-[11rem] max-w-[16rem]",
    cell: (row) => (
      <RowIdentity
        leading={
          <IconTile tone={invoiceStatusConfig[row.status].variant}>
            <FileTextIcon />
          </IconTile>
        }
        title={formatInvoiceNumber(row.invoiceNumber)}
        titleClassName="font-mono text-[13px]"
        subtitle={row.clientName ?? "No client"}
      />
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
          variant="soft"
          className={config.dim ? "opacity-60" : undefined}
        >
          {config.label}
        </StatusBadge>
      );
    },
  },
  {
    header: "Amount",
    className: "whitespace-nowrap text-right",
    cell: (row) => (
      <span
        className={cn(
          "font-semibold tabular-nums",
          invoiceAmountColor[row.status],
        )}
      >
        {formatCurrency(row.total)}
      </span>
    ),
  },
  {
    header: "Due",
    hideBelow: "md",
    className: "whitespace-nowrap",
    cell: (row) => {
      const due = getInvoiceDueLabel(row);
      return (
        <div>
          <div>{formatDate(row.dueDate)}</div>
          <div
            className={cn(
              "text-[12.5px]",
              due.late ? "text-danger-600" : "text-muted-foreground",
            )}
          >
            {due.label}
          </div>
        </div>
      );
    },
  },
  {
    header: "Issued",
    hideBelow: "lg",
    className: "text-muted-foreground whitespace-nowrap",
    cell: (row) => formatDate(row.issueDate),
  },
  {
    header: "Project",
    hideBelow: "xl",
    className: "max-w-[12rem] text-muted-foreground",
    cell: (row) => (
      <span className="block truncate">{row.projectTitle ?? "—"}</span>
    ),
  },
  {
    header: <span className="sr-only">Actions</span>,
    revealOnHover: true,
    className: "w-[1%] whitespace-nowrap text-right",
    cell: (row) => <InvoiceRowActions invoice={row} />,
  },
];
