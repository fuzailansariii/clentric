"use client";

import { useState } from "react";

import type { RevenueMonth } from "@/app/(dashboard)/dashboard/money-queries";
import {
  formatCurrencyCompact,
  formatCurrencyWhole,
} from "@/lib/format-currency";
import { cn } from "@/lib/utils";

const SERIES = [
  { key: "paid", label: "Paid", color: "bg-chart-paid" },
  { key: "invoiced", label: "Invoiced", color: "bg-chart-invoiced" },
] as const;

// Clean axis steps: 1, 2, 2.5 or 5 times a power of ten.
function niceStep(raw: number) {
  const exp = 10 ** Math.floor(Math.log10(raw));
  const f = raw / exp;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * exp;
}

function axisTicks(max: number) {
  const step = niceStep(max / 4);
  const top = step * Math.ceil(max / step);
  return Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
}

function monthDate(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1);
}

const shortMonth = new Intl.DateTimeFormat("en-US", { month: "short" });
const longMonth = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});

export function RevenueLegend() {
  return (
    <ul className="flex items-center gap-4 text-xs">
      {SERIES.map((series) => (
        <li key={series.key} className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className={cn("size-2.5 rounded-xs", series.color)}
          />
          <span className="text-muted-foreground">{series.label}</span>
        </li>
      ))}
    </ul>
  );
}

export function RevenuePlot({
  months,
  currency,
}: {
  months: RevenueMonth[];
  currency: string;
}) {
  const [active, setActive] = useState<number | null>(null);

  const values = months.map((m) => ({
    paid: Number(m.paid),
    invoiced: Number(m.invoiced),
  }));
  const max = Math.max(...values.flatMap((v) => [v.paid, v.invoiced]));
  const ticks = axisTicks(max);
  const top = ticks[ticks.length - 1];
  const pct = (value: number) => (value / top) * 100;
  const lastIndex = months.length - 1;

  return (
    <>
      {/* Hover is a convenience; this table carries every value. */}
      <table className="sr-only">
        <caption>Paid and invoiced per month, {currency}</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Paid</th>
            <th scope="col">Invoiced</th>
          </tr>
        </thead>
        <tbody>
          {months.map((m) => (
            <tr key={m.month}>
              <th scope="row">{longMonth.format(monthDate(m.month))}</th>
              <td>{formatCurrencyWhole(m.paid, currency)}</td>
              <td>{formatCurrencyWhole(m.invoiced, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div aria-hidden="true" className="flex h-60 flex-col">
        <div className="relative flex-1">
          {ticks.map((tick) => (
            <div
              key={tick}
              className="absolute inset-x-0 flex translate-y-1/2 items-center gap-2"
              style={{ bottom: `${pct(tick)}%` }}
            >
              <span className="text-muted-foreground w-10 shrink-0 text-right text-[11px] tabular-nums">
                {formatCurrencyCompact(tick, currency)}
              </span>
              <span className="bg-border h-px flex-1" />
            </div>
          ))}

          <div
            className="absolute inset-y-0 right-0 left-12 flex"
            onMouseLeave={() => setActive(null)}
          >
            {values.map((value, index) => (
              <div
                key={months[index].month}
                className="relative flex flex-1 items-end justify-center"
                onMouseEnter={() => setActive(index)}
              >
                <div
                  className={cn(
                    "absolute inset-x-1 inset-y-0 rounded-md transition-colors",
                    active === index && "bg-foreground/5",
                  )}
                />
                <div className="relative flex h-full items-end gap-0.5">
                  {SERIES.map((series) => (
                    <span
                      key={series.key}
                      className={cn(
                        "w-3 rounded-t @md:w-5 @2xl:w-6",
                        series.color,
                      )}
                      style={{
                        height: `${pct(value[series.key])}%`,
                        minHeight: value[series.key] > 0 ? 2 : 0,
                      }}
                    />
                  ))}
                </div>

                {active === index && (
                  <div
                    className={cn(
                      "bg-popover text-popover-foreground border-border absolute top-0 z-10 w-max rounded-lg border px-3 py-2 text-xs shadow-md",
                      index === 0
                        ? "left-1"
                        : index === lastIndex
                          ? "right-1"
                          : "left-1/2 -translate-x-1/2",
                    )}
                  >
                    <p className="mb-1 font-semibold">
                      {longMonth.format(monthDate(months[index].month))}
                    </p>
                    {SERIES.map((series) => (
                      <p
                        key={series.key}
                        className="flex items-center gap-1.5 tabular-nums"
                      >
                        <span
                          className={cn("size-2 rounded-xs", series.color)}
                        />
                        <span className="text-muted-foreground">
                          {series.label}
                        </span>
                        <span className="ml-auto pl-3 font-medium">
                          {formatCurrencyWhole(
                            months[index][series.key],
                            currency,
                          )}
                        </span>
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-2 flex pl-12">
          {months.map((m, index) => (
            <span
              key={m.month}
              className={cn(
                "flex-1 text-center text-xs",
                index === lastIndex
                  ? "text-foreground font-medium"
                  : "text-muted-foreground",
              )}
            >
              {shortMonth.format(monthDate(m.month))}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
