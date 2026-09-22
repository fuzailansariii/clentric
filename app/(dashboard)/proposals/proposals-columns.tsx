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
        {formatCurrency(row.total)}
      </span>
    ),
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
