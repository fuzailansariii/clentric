"use client";

import { FileTextIcon } from "lucide-react";
import { MobileListRow } from "@/components/data-table/row-parts";
import { IconTile } from "@/components/ui/icon-tile";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/format-currency";
import { formatInvoiceNumber } from "@/lib/format-invoice-number";
import { cn } from "@/lib/utils";
import { getInvoiceDueLabel } from "./invoice-due-label";
import { InvoiceRowActions } from "./invoice-row-actions";
import {
  invoiceAmountColor,
  invoiceStatusConfig,
} from "./invoice-status-config";
import type { InvoiceListItem } from "./queries";

// Mobile shows: invoice number, client · due/overdue, amount, status.
// Project and issue date stay on the detail page.
export function renderInvoiceMobileCard(invoice: InvoiceListItem) {
  const config = invoiceStatusConfig[invoice.status];
  const due = getInvoiceDueLabel(invoice);

  return (
    <MobileListRow
      leading={
        <IconTile tone={config.variant} size="md">
          <FileTextIcon />
        </IconTile>
      }
      title={formatInvoiceNumber(invoice.invoiceNumber, invoice.numberPrefix)}
      titleClassName="font-mono text-[13.5px]"
      subtitle={
        <>
          {invoice.clientName ?? "No client"} ·{" "}
          <span className={cn(due.late && "text-danger-600")}>{due.label}</span>
        </>
      }
      trailing={
        <>
          <span
            className={cn(
              "text-sm font-semibold tabular-nums",
              invoiceAmountColor[invoice.status],
            )}
          >
            {formatCurrency(invoice.total, invoice.currency)}
          </span>
          <StatusBadge
            status={config.variant}
            variant="soft"
            size="sm"
            className={config.dim ? "opacity-60" : undefined}
          >
            {config.label}
          </StatusBadge>
        </>
      }
      actions={<InvoiceRowActions invoice={invoice} compact />}
    />
  );
}
