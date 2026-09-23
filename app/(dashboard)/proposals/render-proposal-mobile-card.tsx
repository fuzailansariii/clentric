"use client";

import { FileSignatureIcon } from "lucide-react";
import { MobileListRow } from "@/components/data-table/row-parts";
import { IconTile } from "@/components/ui/icon-tile";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/format-currency";
import { formatDate } from "@/lib/format-date";
import { cn } from "@/lib/utils";
import {
  proposalAmountColor,
  proposalStatusConfig,
} from "./proposal-status-config";
import type { ProposalListItem } from "./queries";
import { DepositBadge } from "./proposals-columns";

// Mobile shows: title, client · created, amount, status. Expiry stays on the
// wider table, where there is room for a date that is usually empty.
export function renderProposalMobileCard(proposal: ProposalListItem) {
  const config = proposalStatusConfig[proposal.status];

  return (
    <MobileListRow
      leading={
        <IconTile tone={config.variant} size="md">
          <FileSignatureIcon />
        </IconTile>
      }
      title={proposal.title}
      titleClassName="truncate"
      subtitle={
        <>
          {proposal.clientCompany ?? proposal.clientName}
          {proposal.milestoneCount > 0 && (
            <>
              {" · "}
              {proposal.milestoneCount}{" "}
              {proposal.milestoneCount === 1 ? "stage" : "stages"}
            </>
          )}
          {" · "}
          {formatDate(proposal.createdAt)}
        </>
      }
      trailing={
        <>
          <span
            className={cn(
              "text-sm font-semibold tabular-nums",
              proposalAmountColor[proposal.status],
            )}
          >
            {formatCurrency(proposal.total, proposal.currency)}
          </span>
          <StatusBadge
            status={config.variant}
            variant="soft"
            size="sm"
            className={config.dim ? "opacity-60" : undefined}
          >
            {config.label}
          </StatusBadge>
          {Number(proposal.depositPercent) > 0 && (
            <DepositBadge row={proposal} />
          )}
        </>
      }
    />
  );
}
