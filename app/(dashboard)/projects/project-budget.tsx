import { AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/format-currency";
import { projectLedger, sumProjectInvoices } from "@/lib/project-ledger";
import { cn } from "@/lib/utils";

type ProjectBudgetProps = {
  pricing: "fixed" | "hourly";
  budget: string;
  currency: string;
  invoices: readonly { status: string; total: string }[];
};

/** Where a project stands against its agreed price or estimate. Warns, never blocks. */
export function ProjectBudget({
  pricing,
  budget,
  currency,
  invoices,
}: ProjectBudgetProps) {
  const ledger = projectLedger({ budget, ...sumProjectInvoices(invoices) });
  if (ledger.budget === null && ledger.billed === 0 && ledger.drafts === 0) {
    return null;
  }

  const money = (n: number) => formatCurrency(String(n), currency);
  const hourly = pricing === "hourly";
  const target = hourly ? "estimate" : "agreed price";
  const warn = ledger.isOver && !hourly;
  const scale = Math.max(ledger.budget ?? 0, ledger.billed) || 1;

  return (
    <div
      className={cn(
        "border-t px-3 py-3 text-sm sm:px-5",
        warn && "bg-warning-600/10",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <span className="font-medium tabular-nums">
          {ledger.budget === null
            ? `Billed ${money(ledger.billed)} so far`
            : `Billed ${money(ledger.billed)} of ${money(ledger.budget)} ${target}`}
        </span>
        {ledger.remaining !== null && (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 font-medium tabular-nums",
              warn ? "text-warning-600" : "text-muted-foreground",
            )}
          >
            {warn && <AlertTriangle aria-hidden="true" className="size-4" />}
            {ledger.isOver
              ? `${money(-ledger.remaining)} over the ${target}`
              : ledger.remaining === 0
                ? "Fully billed"
                : `${money(ledger.remaining)} left to bill`}
          </span>
        )}
      </div>

      {ledger.budget !== null && (
        <div
          role="img"
          aria-label={`${ledger.percent}% of the ${target} billed`}
          className="bg-muted mt-2.5 flex h-1.5 overflow-hidden rounded-full"
        >
          <span
            className={cn("h-full", warn ? "bg-warning-600" : "bg-primary")}
            style={{ width: `${(ledger.paid / scale) * 100}%` }}
          />
          <span
            className={cn(
              "h-full",
              warn ? "bg-warning-600/50" : "bg-primary/40",
            )}
            style={{ width: `${(ledger.outstanding / scale) * 100}%` }}
          />
        </div>
      )}

      <dl className="text-muted-foreground mt-2.5 flex flex-wrap gap-x-5 gap-y-1 tabular-nums">
        <div className="flex gap-1.5">
          <dt>Paid</dt>
          <dd className="text-foreground">{money(ledger.paid)}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt>Outstanding</dt>
          <dd className="text-foreground">{money(ledger.outstanding)}</dd>
        </div>
        {ledger.drafts > 0 && (
          <div className="flex gap-1.5">
            <dt>In drafts</dt>
            <dd className="text-foreground">{money(ledger.drafts)}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}
