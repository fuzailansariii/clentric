import type { ReactNode } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";

import type { DashboardMoney } from "@/app/(dashboard)/dashboard/money-queries";
import {
  statusToneStyles,
  type StatusTone,
} from "@/components/ui/status-badge";
import { formatCurrencyWhole } from "@/lib/format-currency";
import { cn } from "@/lib/utils";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** `null` means the figures failed to load. */
export function StatTiles({ money }: { money: DashboardMoney | null }) {
  if (money === null) {
    return (
      <div className="border-border bg-card text-muted-foreground rounded-xl border px-4 py-4 text-sm shadow-sm">
        Couldn&apos;t load your figures. Refresh the page to try again.
      </div>
    );
  }

  const fmt = (value: string) => formatCurrencyWhole(value, money.currency);

  return (
    // Container query: the open sidebar eats into the width.
    <div className="@container">
      <div className="border-border bg-border grid grid-cols-2 gap-px overflow-hidden rounded-xl border shadow-sm @4xl:grid-cols-4">
        <Tile
          tone="success"
          label="Paid this month"
          value={fmt(money.paidThisMonth)}
        >
          <PaidDelta
            current={Number(money.paidThisMonth)}
            previous={Number(money.paidLastMonthSoFar)}
          />
        </Tile>

        <Tile tone="info" label="Outstanding" value={fmt(money.outstanding)}>
          <span className="text-muted-foreground">
            {money.outstandingCount === 0
              ? "Nothing waiting"
              : plural(money.outstandingCount, "invoice")}
          </span>
        </Tile>

        <Tile tone="danger" label="Overdue" value={fmt(money.overdue)}>
          {money.overdueCount === 0 ? (
            <span className="text-muted-foreground">Nothing overdue</span>
          ) : (
            <span className="text-danger-600">
              {plural(money.overdueCount, "invoice")}
              {money.oldestOverdueDays !== null &&
                ` · oldest ${plural(money.oldestOverdueDays, "day")}`}
            </span>
          )}
        </Tile>

        <Tile
          tone="info"
          label="Proposals awaiting reply"
          value={fmt(money.awaitingReply)}
        >
          <span className="text-muted-foreground">
            {money.awaitingReplyCount === 0
              ? "None out right now"
              : plural(money.awaitingReplyCount, "proposal")}
          </span>
        </Tile>
      </div>
    </div>
  );
}

function Tile({
  tone,
  label,
  value,
  children,
}: {
  tone: StatusTone;
  label: string;
  value: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-card min-w-0 px-3 py-2.5 @md:px-4 @md:py-3 @4xl:px-5 @4xl:py-4">
      <div className="flex items-center gap-1.5 @4xl:gap-2">
        <span
          aria-hidden="true"
          className={cn(
            "inline-flex size-4 shrink-0 items-center justify-center rounded @4xl:size-5 @4xl:rounded-md",
            statusToneStyles[tone],
          )}
        >
          <span className="size-1.5 rounded-full bg-current" />
        </span>
        <span className="text-muted-foreground truncate text-xs @4xl:text-sm">
          {label}
        </span>
      </div>
      <p className="mt-1.5 truncate text-xl font-semibold tracking-tight @md:text-2xl @4xl:mt-3 @4xl:text-3xl">
        {value}
      </p>
      <div className="mt-1 flex min-h-5 items-center text-[11px] @md:text-xs @4xl:mt-1.5">
        {children}
      </div>
    </div>
  );
}

function PaidDelta({
  current,
  previous,
}: {
  current: number;
  previous: number;
}) {
  // No baseline to compare against: say what the number is instead.
  if (previous === 0) {
    return <span className="text-muted-foreground">So far this month</span>;
  }

  const change = Math.round(((current - previous) / previous) * 100);
  const up = change >= 0;
  const Arrow = up ? ArrowUp : ArrowDown;

  return (
    <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
      <span
        className={cn(
          "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium tabular-nums",
          up ? statusToneStyles.success : statusToneStyles.danger,
        )}
      >
        <Arrow className="size-3" aria-hidden="true" />
        <span className="sr-only">{up ? "Up" : "Down"} </span>
        {Math.abs(change)}%
      </span>
      <span className="text-muted-foreground">vs same days last month</span>
    </span>
  );
}
