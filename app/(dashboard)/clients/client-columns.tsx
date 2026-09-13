import type { ClientRow } from "@/src/db/schema/clients";
import type { Column } from "@/components/data-table/data-table.types";
import { RowIdentity } from "@/components/data-table/row-parts";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/format-date";
import { formatPhone } from "@/lib/format-phone";
import { clientStatusConfig } from "./client-status-config";
import { ClientRowActions } from "./client-row-actions";

// Visibility by table width — always: Client (with company underneath),
// Status, Email · 860px+: Phone · 1000px+: Added.
export const clientColumns: Column<ClientRow>[] = [
  {
    header: "Client",
    className: "min-w-[12rem] max-w-[18rem]",
    cell: (row) => (
      <RowIdentity
        leading={
          <AvatarInitials
            name={row.name}
            variant="colored"
            shape="square"
            className="h-8 w-8 rounded-lg text-[11px]"
          />
        }
        title={row.name}
        subtitle={row.company ?? "No company"}
      />
    ),
  },

  {
    header: "Status",
    className: "w-[1%] whitespace-nowrap",
    cell: (row) => {
      const config = clientStatusConfig[row.status];
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
    header: "Email",
    className: "max-w-[16rem] text-muted-foreground",
    cell: (row) => <span className="block truncate">{row.email ?? "—"}</span>,
  },

  {
    header: "Phone",
    hideBelow: "lg",
    className: "text-muted-foreground whitespace-nowrap tabular-nums",
    cell: (row) => formatPhone(row.phone),
  },

  {
    header: "Added",
    hideBelow: "xl",
    className: "text-muted-foreground whitespace-nowrap",
    cell: (row) => formatDate(row.createdAt),
  },

  {
    header: <span className="sr-only">Actions</span>,
    revealOnHover: true,
    className: "w-[1%] whitespace-nowrap text-right",
    cell: (row) => <ClientRowActions client={row} />,
  },
];
