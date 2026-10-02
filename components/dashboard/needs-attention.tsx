import Link from "next/link";
import { CircleAlert, Clock, Wallet, type LucideIcon } from "lucide-react";

import type { AttentionItem } from "@/app/(dashboard)/dashboard/attention-queries";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import {
  statusToneStyles,
  type StatusTone,
} from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/format-currency";
import { formatInvoiceNumber } from "@/lib/format-invoice-number";
import { cn } from "@/lib/utils";

type Row = {
  key: string;
  href: string;
  icon: LucideIcon;
  tone: StatusTone;
  lead: string;
  rest: string;
  amount?: string;
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function toRow(item: AttentionItem): Row {
  switch (item.kind) {
    case "payment_claimed":
      return {
        key: `claim-${item.id}`,
        href: `/invoices/${item.id}`,
        icon: Wallet,
        tone: "warning",
        lead: item.clientName,
        rest: `says they paid ${formatInvoiceNumber(item.invoiceNumber, item.numberPrefix)} · confirm it`,
        amount: formatCurrency(item.total, item.currency),
      };
    case "overdue":
      return {
        key: `overdue-${item.id}`,
        href: `/invoices/${item.id}`,
        icon: CircleAlert,
        tone: "danger",
        lead: formatInvoiceNumber(item.invoiceNumber, item.numberPrefix),
        rest: `from ${item.clientName} is ${plural(item.daysLate, "day")} overdue`,
        amount: formatCurrency(item.total, item.currency),
      };
    case "expiring":
      return {
        key: `expiring-${item.id}`,
        href: `/proposals/${item.id}`,
        icon: Clock,
        tone: "warning",
        lead: `“${item.title}”`,
        rest: `for ${item.clientName} expires ${item.daysLeft <= 1 ? "within a day" : `in ${item.daysLeft} days`}`,
      };
  }
}

/** `null` means the list failed to load. */
export function NeedsAttention({ items }: { items: AttentionItem[] | null }) {
  return (
    <DashboardCard id="needs-attention-title" title="Needs your attention">
      {items === null ? (
        <p className="text-muted-foreground px-4 py-4 text-sm">
          Couldn&apos;t load this. Refresh the page to try again.
        </p>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground px-4 py-4 text-sm">
          You&apos;re all caught up.
        </p>
      ) : (
        <ul className="divide-border divide-y">
          {items.map(toRow).map((row) => (
            <AttentionRow key={row.key} row={row} />
          ))}
        </ul>
      )}
    </DashboardCard>
  );
}

function AttentionRow({ row }: { row: Row }) {
  const Icon = row.icon;

  return (
    <li>
      <Link
        href={row.href}
        className="hover:bg-muted/40 focus-visible:ring-ring flex items-center gap-3 px-4 py-3 transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
      >
        <span
          aria-hidden="true"
          className={cn(
            "inline-flex size-7 shrink-0 items-center justify-center rounded-full [&_svg]:size-3.5",
            statusToneStyles[row.tone],
          )}
        >
          <Icon />
        </span>
        <p className="text-muted-foreground min-w-0 flex-1 text-sm leading-snug">
          <span className="text-foreground font-semibold">{row.lead}</span>{" "}
          {row.rest}
        </p>
        {row.amount && (
          <span className="shrink-0 text-sm font-medium tabular-nums">
            {row.amount}
          </span>
        )}
      </Link>
    </li>
  );
}
