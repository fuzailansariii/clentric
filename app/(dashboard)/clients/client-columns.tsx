import type { ClientRow } from "@/src/db/schema/clients";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { StatusBadge } from "@/components/ui/status-badge";
import { clientStatusConfig } from "./client-status-config";
import type { Column } from "@/components/data-table/data-table.types";
import { ClientRowActions } from "./client-row-actions";
import { formatPhone } from "@/lib/format-phone";
import { formatDate } from "@/lib/format-date";

export const clientColumns: Column<ClientRow>[] = [
  {
    header: "Profile",
    className: "min-w-[9rem] max-w-[14rem]",

    cell: (row) => (
      <div className="flex min-w-0 items-center gap-2.5">
        <AvatarInitials
          name={row.name}
          variant="colored"
          shape="circle"
          className="shrink-0"
        />

        <div className="min-w-0">
          <div className="truncate font-medium">{row.name}</div>

          {row.email && (
            <div className="text-muted-foreground truncate text-xs">
              {row.email}
            </div>
          )}
        </div>
      </div>
    ),
  },

  {
    header: "Company",
    hideBelow: "md",
    className: "max-w-[10rem] text-muted-foreground",
    cell: (row) => (
      <span className="block truncate">{row.company ?? "—"}</span>
    ),
  },

  {
    header: "Phone",
    hideBelow: "sm",
    className: "text-muted-foreground whitespace-nowrap",
    cell: (row) => formatPhone(row.phone),
  },

  {
    header: "Created",
    hideBelow: "xl",
    className: "text-muted-foreground whitespace-nowrap",
    cell: (row) => formatDate(row.createdAt),
  },

  {
    header: "Status",
    className: "w-[1%] whitespace-nowrap",
    cell: (row) => {
      const config = clientStatusConfig[row.status];
      return (
        <StatusBadge
          status={config.variant}
          className={config.dim ? "opacity-60" : undefined}
        >
          {config.label}
        </StatusBadge>
      );
    },
  },

  {
    header: "Actions",
    className: "w-[1%] whitespace-nowrap text-right",
    cell: (row) => <ClientRowActions client={row} />,
  },
];
