import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type StatSummaryItem = {
  label: string;
  value: ReactNode;
  /** Tailwind text-color class for the value, e.g. "text-emerald-600".
   * Defaults to the standard foreground color when omitted. */
  valueColor?: string;
};

/**
 * A one-line summary strip for the top of a list page.
 *
 * List pages already tell you how many of each status there are, in the
 * filter chips above the table. A row of large cards repeating those counts
 * pushes the table itself below the fold and says nothing new, so list pages
 * carry this instead and keep the cards for detail pages, where a single
 * record has room for them.
 *
 * Only figures the chips cannot show belong here — money, mostly. Per-status
 * counts stay in the chips.
 */
export function StatsSummary({ items }: { items: StatSummaryItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="@container">
      <dl className="flex flex-wrap items-baseline gap-x-6 gap-y-2 @[640px]:gap-x-8">
        {items.map((item) => (
          <div key={item.label} className="flex min-w-0 items-baseline gap-2">
            <dt className="text-muted-foreground shrink-0 font-mono text-[10px] font-medium tracking-wider uppercase">
              {item.label}
            </dt>
            <dd
              className={cn(
                "min-w-0 truncate text-sm font-semibold tracking-tight tabular-nums @[640px]:text-base",
                item.valueColor ?? "text-foreground",
              )}
            >
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
