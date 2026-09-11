import { formatCurrency } from "@/lib/format-currency";
import { formatDate } from "@/lib/format-date";
import { formatInvoiceNumber } from "@/lib/format-invoice-number";
import { invoiceAmountColor } from "./invoice-status-config";
import { cn } from "@/lib/utils";
import type { InvoiceListItem } from "./queries";

export function renderInvoiceMobileCard(invoice: InvoiceListItem) {
  return (
    <div className="px-4 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-medium">
              {formatInvoiceNumber(invoice.invoiceNumber)}
            </span>

            <span className="text-muted-foreground text-[10px]">•</span>

            <span className="text-muted-foreground text-[11px] capitalize">
              {invoice.status}
            </span>
          </div>

          {/* Project is the headline — client is the secondary line below it. */}
          <p className="mt-1.5 truncate text-sm font-medium">
            {invoice.projectTitle ?? "—"}
          </p>
          <p className="text-muted-foreground truncate text-xs">
            {invoice.clientName ?? "—"}
          </p>
        </div>
        <p
          className={cn(
            "shrink-0 text-sm font-semibold",
            invoiceAmountColor[invoice.status],
          )}
        >
          {formatCurrency(invoice.total)}
        </p>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <p className="text-muted-foreground text-[10px] font-medium tracking-[0.06em] uppercase">
          Due date
        </p>
        <p className="text-xs font-medium">{formatDate(invoice.dueDate)}</p>
      </div>
    </div>
  );
}
