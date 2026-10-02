import type { DashboardMoney } from "@/app/(dashboard)/dashboard/money-queries";
import {
  RevenueLegend,
  RevenuePlot,
} from "@/components/dashboard/revenue-chart";
import { formatCurrencyWhole } from "@/lib/format-currency";

export function RevenueCard({ money }: { money: DashboardMoney | null }) {
  if (money === null) return null;

  const totalPaid = money.months.reduce((sum, m) => sum + Number(m.paid), 0);
  const isEmpty = money.months.every(
    (m) => Number(m.paid) === 0 && Number(m.invoiced) === 0,
  );

  return (
    <section
      aria-labelledby="revenue-title"
      className="border-border bg-card @container rounded-xl border px-4 py-4 shadow-sm @2xl:px-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="revenue-title" className="text-muted-foreground text-sm">
            Revenue
          </h2>
          <p className="mt-1 text-2xl font-semibold tracking-tight @2xl:text-3xl">
            {formatCurrencyWhole(String(totalPaid), money.currency)}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            Paid in the last {money.months.length} months · {money.currency}
            {money.hasOtherCurrencies && " · other currencies not included"}
          </p>
        </div>
        <RevenueLegend />
      </div>

      <div className="mt-5">
        {isEmpty ? (
          <p className="text-muted-foreground border-border rounded-lg border border-dashed px-4 py-10 text-center text-sm">
            Paid and invoiced amounts will chart here once you send invoices.
          </p>
        ) : (
          <RevenuePlot months={money.months} currency={money.currency} />
        )}
      </div>
    </section>
  );
}
