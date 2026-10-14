import { AvatarInitials } from "@/components/ui/avatar-initials";
import { formatCurrency, formatNumber } from "@/lib/format-currency";

const qty = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
import { formatDayValue } from "@/lib/format-due";
import { lineItemUnits } from "@/lib/format-line-item";
import type { InvoiceItemUnit } from "@/src/db/schema/invoice-items";

type PreviewLine = {
  description?: string;
  quantity?: unknown;
  rate?: unknown;
  unit?: InvoiceItemUnit;
};

type InvoicePreviewProps = {
  /** Who the invoice is from: business name, else person, else email. */
  issuerName: string;
  /** "INV-015", or the number this invoice will most likely get. */
  numberLabel: string;
  clientName?: string;
  projectName?: string;
  dueDate?: string;
  lines: PreviewLine[];
  subTotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
};

const labelClass =
  "text-muted-foreground text-[10.5px] font-semibold tracking-[0.12em] uppercase";

/** A small live copy of the invoice beside the form. */
export default function InvoicePreview({
  issuerName,
  numberLabel,
  clientName,
  projectName,
  dueDate,
  lines,
  subTotal,
  taxRate,
  taxAmount,
  total,
}: InvoicePreviewProps) {
  const money = (n: number) => formatCurrency(String(n));
  const filled = lines.filter(
    (line) => line.description?.trim() || Number(line.rate) > 0,
  );

  return (
    <section
      aria-label="Invoice preview"
      className="bg-card min-w-0 rounded-lg border p-4 shadow-xs sm:p-4.5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <AvatarInitials
            name={issuerName}
            shape="square"
            size="sm"
            variant="accent"
            className="shrink-0"
          />
          <span className="truncate text-[13px] font-semibold">
            {issuerName}
          </span>
        </div>
        <div className="text-right">
          <p className={labelClass}>Invoice</p>
          <p className="text-muted-foreground font-space text-[12.5px] tabular-nums">
            {numberLabel}
          </p>
        </div>
      </div>

      <p className={`${labelClass} mt-3.5`}>Bill to</p>
      <p className="text-sm font-medium wrap-anywhere">
        {clientName || "Choose a client"}
      </p>
      <p className="text-muted-foreground mb-2.5 text-[12.5px]">
        {projectName ?? "No project"} ·{" "}
        {dueDate ? `Due ${formatDayValue(dueDate)}` : "No due date"}
      </p>

      {filled.length === 0 ? (
        <p className="text-muted-foreground border-t py-2.5 text-[13px]">
          Lines show up here as you type.
        </p>
      ) : (
        filled.map((line, index) => {
          const quantity = Number(line.quantity) || 0;
          const rate = Number(line.rate) || 0;
          const unit = lineItemUnits[line.unit ?? "item"];
          return (
            <div
              key={index}
              className="flex justify-between gap-3 border-t py-2 text-[13px]"
            >
              <span className="min-w-0">
                <span className="block wrap-anywhere">
                  {line.description || "Untitled line"}
                </span>
                <span className="text-muted-foreground block text-xs">
                  {qty.format(quantity)} × {money(rate)}
                  {unit.rateSuffix}
                </span>
              </span>
              <span className="font-space tabular-nums">
                {money(quantity * rate)}
              </span>
            </div>
          );
        })
      )}

      <div className="border-t pt-2.5 text-[13px]">
        {taxAmount > 0 && (
          <>
            <div className="flex justify-between gap-3 py-0.5">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-space tabular-nums">{money(subTotal)}</span>
            </div>
            <div className="flex justify-between gap-3 py-0.5">
              <span className="text-muted-foreground">
                Tax ({formatNumber(taxRate)}%)
              </span>
              <span className="font-space tabular-nums">
                {money(taxAmount)}
              </span>
            </div>
          </>
        )}
        <div className="flex items-baseline justify-between gap-3 pt-1 font-semibold">
          <span>Total due</span>
          <span className="font-space text-lg font-medium tabular-nums">
            {money(total)}
          </span>
        </div>
      </div>

      <p className="text-muted-foreground mt-2.5 text-xs">
        Emailed to your client with a PDF attached.
      </p>
    </section>
  );
}
