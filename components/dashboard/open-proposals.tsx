import Link from "next/link";
import { CircleAlert, FileText } from "lucide-react";

import type { OpenProposal } from "@/app/(dashboard)/dashboard/queries";
import { proposalStatusConfig } from "@/app/(dashboard)/proposals/proposal-status-config";
import { ClientCell } from "@/components/dashboard/client-cell";
import {
  DashboardCard,
  DashboardCardEmpty,
} from "@/components/dashboard/dashboard-card";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/format-currency";
import { formatShortDate } from "@/lib/format-due";
import { cn } from "@/lib/utils";

const EXPIRING_SOON_DAYS = 2;

// Title | Client | Value | Status | Expires; narrow cards keep title + status.
const GRID =
  "grid-cols-[minmax(0,1fr)_auto] @lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto_auto_auto]";

function statusFor(proposal: OpenProposal): {
  tone: StatusTone;
  label: string;
} {
  if (
    proposal.daysUntilExpiry !== null &&
    proposal.daysUntilExpiry <= EXPIRING_SOON_DAYS
  ) {
    return { tone: "danger", label: "Expiring soon" };
  }
  const config = proposalStatusConfig[proposal.status];
  return { tone: config.variant, label: config.label };
}

/** `null` means the list failed to load. */
export function OpenProposals({
  data,
}: {
  data: { items: OpenProposal[]; total: number } | null;
}) {
  return (
    <DashboardCard
      id="open-proposals-title"
      title="Open proposals"
      count={data?.total}
      viewAllHref="/proposals"
    >
      {data === null ? (
        <DashboardCardEmpty
          icon={CircleAlert}
          title="Couldn't load proposals"
          text="Refresh the page to try again."
        />
      ) : data.items.length === 0 ? (
        <DashboardCardEmpty
          icon={FileText}
          title="No open proposals"
          text="Sent proposals waiting on a reply show up here."
        />
      ) : (
        <div className={cn("grid gap-x-4", GRID)}>
          <div
            aria-hidden="true"
            className="text-muted-foreground border-border col-span-full grid grid-cols-subgrid border-b px-4 py-2 text-xs"
          >
            <span>Title</span>
            <span className="hidden @lg:block">Client</span>
            <span className="hidden text-right @lg:block">Value</span>
            <span>Status</span>
            <span className="hidden text-right @lg:block">Expires</span>
          </div>
          <ul className="divide-border col-span-full grid grid-cols-subgrid divide-y">
            {data.items.map((proposal) => (
              <ProposalRow key={proposal.id} proposal={proposal} />
            ))}
          </ul>
        </div>
      )}
    </DashboardCard>
  );
}

function ProposalRow({ proposal }: { proposal: OpenProposal }) {
  const status = statusFor(proposal);
  const value = formatCurrency(proposal.total, proposal.currency);

  return (
    <li className="col-span-full grid grid-cols-subgrid">
      <Link
        href={`/proposals/${proposal.id}`}
        className="hover:bg-muted/40 focus-visible:ring-ring col-span-full grid grid-cols-subgrid items-center px-4 py-3 transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
      >
        <div className="min-w-0">
          <p className="line-clamp-2 text-sm font-medium break-words">
            {proposal.title}
          </p>
          <span className="mt-1 flex min-w-0 items-center gap-1.5 @lg:hidden">
            <ClientCell name={proposal.clientName} />
            <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
              · {value}
            </span>
          </span>
        </div>

        <ClientCell name={proposal.clientName} className="hidden @lg:flex" />

        <span className="hidden text-right text-sm font-medium tabular-nums @lg:block">
          {value}
        </span>

        <StatusBadge status={status.tone} variant="soft" size="sm">
          {status.label}
        </StatusBadge>

        <span className="text-muted-foreground hidden text-right text-xs tabular-nums @lg:block">
          {proposal.expiresAt ? formatShortDate(proposal.expiresAt) : "-"}
        </span>
      </Link>
    </li>
  );
}
