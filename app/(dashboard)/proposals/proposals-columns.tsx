import { FileSignatureIcon } from "lucide-react";
import type { Column } from "@/components/data-table/data-table.types";
import { RowIdentity } from "@/components/data-table/row-parts";
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

/**
 * Only rendered once a deposit has actually been asked for. "Paid" reflects
 * the freelancer's own Mark as paid click — a client pressing "I've sent
 * payment" never moves it.
 */
export function DepositBadge({ row }: { row: ProposalListItem }) {
  if (Number(row.depositPercent) <= 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  if (row.depositPaid === null) {
    return (
      <StatusBadge status="neutral" variant="soft" className="opacity-60">
        No invoice
      </StatusBadge>
    );
  }

  return (
    <StatusBadge
      status={row.depositPaid ? "success" : "warning"}
      variant="soft"
    >
      {row.depositPaid ? "Deposit paid" : "Deposit due"}
    </StatusBadge>
  );
}

// Visibility by table width — always: Proposal (client underneath), Status,
// Amount · 768px+: Created · 1024px+: Expires. Amount never hides: it is the
// figure people scan a proposal list for.
export const proposalColumns: Column<ProposalListItem>[] = [
  {
    header: "Proposal",
    className: "min-w-[11rem] max-w-[18rem]",
    cell: (row) => (
      <RowIdentity
        leading={
          <IconTile tone={proposalStatusConfig[row.status].variant}>
            <FileSignatureIcon />
          </IconTile>
        }
        title={row.title}
        // Long titles truncate rather than wrapping to a second line, so
        // every row keeps the same height.
        titleClassName="truncate"
        subtitle={row.clientCompany ?? row.clientName}
      />
    ),
  },
  {
    header: "Status",
    className: "w-[1%] whitespace-nowrap",
    cell: (row) => {
      const config = proposalStatusConfig[row.status];
      return (
        <StatusBadge
          status={config.variant}
          variant="soft"
          className={config.dim ? "opacity-60" : undefined}
        >
          {config.label}
        </StatusBadge>
      );
    },
  },
  {
    header: "Amount",
    className: "whitespace-nowrap text-right",
    cell: (row) => (
      <span
        className={cn(
          "font-semibold tabular-nums",
          proposalAmountColor[row.status],
        )}
      >
        {formatCurrency(row.total, row.currency)}
      </span>
    ),
  },
  {
    header: "Stages",
    hideBelow: "md",
    className: "text-muted-foreground w-[1%] whitespace-nowrap",
    cell: (row) =>
      row.milestoneCount === 0
        ? "—"
        : `${row.milestoneCount} ${row.milestoneCount === 1 ? "stage" : "stages"}`,
  },
  {
    header: "Deposit",
    hideBelow: "lg",
    className: "w-[1%] whitespace-nowrap",
    cell: (row) => <DepositBadge row={row} />,
  },
  {
    header: "Created",
    hideBelow: "md",
    className: "text-muted-foreground whitespace-nowrap",
    cell: (row) => formatDate(row.createdAt),
  },
  {
    header: "Expires",
    hideBelow: "lg",
    className: "text-muted-foreground whitespace-nowrap",
    cell: (row) =>
      row.expiresAt ? (
        <span className={cn(row.status === "expired" && "text-danger-600")}>
          {formatDate(row.expiresAt)}
        </span>
      ) : (
        "Never"
      ),
  },
];
