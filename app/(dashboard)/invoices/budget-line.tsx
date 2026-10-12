import { useId } from "react";
import { AlertTriangle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { formatCurrency } from "@/lib/format-currency";
import type { ProjectLedger } from "@/lib/project-ledger";
import { cn } from "@/lib/utils";

type BudgetLineProps = {
  projectTitle: string;
  currency?: string;
  /** Hourly projects compare to an estimate, so going over is only a note. */
  pricing?: "fixed" | "hourly";
  ledger: ProjectLedger & { budget: number };
  /** e.g. "INV-041", when the project's deposit is in "Already billed". */
  depositLabel?: string | null;
  /** The per-invoice "show project balance" switch; fixed-price projects only. */
  balance?: { checked: boolean; onChange: (checked: boolean) => void };
};

/** Live budget position for the project an invoice is billed against. Warns, never blocks. */
export function BudgetLine({
  projectTitle,
  currency,
  pricing = "fixed",
  ledger,
  depositLabel,
  balance,
}: BudgetLineProps) {
  const switchId = useId();
  const money = (n: number) => formatCurrency(String(n), currency);
  const { budget, billed, thisInvoice, remaining, isOver } = ledger;
  const hourly = pricing === "hourly";
  const target = hourly ? "estimate" : "agreed price";
  const warn = isOver && !hourly;
  const scale = Math.max(budget, ledger.total);

  const rows: [string, string, string?][] = [
    [hourly ? "Estimate" : "Agreed price", money(budget)],
    [
      "Already billed",
      money(billed),
      depositLabel ? `incl. deposit ${depositLabel}` : undefined,
    ],
    ["This invoice", money(thisInvoice)],
  ];

  return (
    <section
      aria-label={`Budget for ${projectTitle}`}
      className={cn(
        "rounded-xl border p-4 text-sm",
        warn
          ? "border-warning-600/30 bg-warning-600/10"
          : "border-border bg-card",
      )}
    >
      <p className="text-muted-foreground truncate text-xs">{projectTitle}</p>
      <p
        className={cn(
          "mt-1 flex items-center gap-1.5 text-base font-semibold tabular-nums",
          warn && "text-warning-600",
        )}
      >
        {warn && (
          <AlertTriangle aria-hidden="true" className="size-4 shrink-0" />
        )}
        {isOver
          ? `${money(-(remaining ?? 0))} over the ${target}`
          : remaining === 0
            ? "Fully billed"
            : `${money(remaining ?? 0)} left`}
      </p>

      <div className="bg-muted mt-3 flex h-1.5 overflow-hidden rounded-full">
        <span
          className="bg-foreground/35 h-full"
          style={{ width: `${(billed / scale) * 100}%` }}
        />
        <span
          className={cn("h-full", warn ? "bg-warning-600" : "bg-primary")}
          style={{ width: `${(thisInvoice / scale) * 100}%` }}
        />
      </div>

      <dl className="mt-3 flex flex-col gap-1.5 tabular-nums">
        {rows.map(([label, value, note]) => (
          <div
            key={label}
            className="flex items-baseline justify-between gap-3"
          >
            <dt className="text-muted-foreground">
              {label}
              {note && <span className="block text-xs">{note}</span>}
            </dt>
            <dd className="font-medium">{value}</dd>
          </div>
        ))}
      </dl>

      {warn && depositLabel && (
        <p className="text-warning-600 mt-3 text-xs">
          Billing the full agreed price? Take off deposit {depositLabel} so your
          client isn&apos;t charged twice.
        </p>
      )}

      {balance && (
        <div className="border-border mt-3 flex items-start gap-3 border-t pt-3">
          <Switch
            id={switchId}
            checked={balance.checked}
            onCheckedChange={balance.onChange}
            className="mt-0.5"
          />
          <label htmlFor={switchId} className="cursor-pointer">
            <span className="block font-medium">Show project balance</span>
            <span className="text-muted-foreground block text-xs">
              Prints the project total, what&apos;s paid and what&apos;s left on
              this invoice.
            </span>
          </label>
        </div>
      )}
    </section>
  );
}
