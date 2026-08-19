import type { ClientRow } from "@/src/db/schema/clients";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { StatusBadge } from "@/components/ui/status-badge";
import { clientStatusConfig } from "./client-status-config";
import type { Column } from "@/components/data-table/data-table.types";
import { formatPhone } from "@/lib/format-phone";
import { formatDate } from "@/lib/format-date";

export const clientColumns: Column<ClientRow>[] = [
  {
    header: "Profile",
    className: "w-[34%] md:w-[32%] lg:w-[30%]",

    cell: (row) => (
      <div className="flex min-w-0 items-center gap-2.5">
        <AvatarInitials name={row.name} variant="colored" shape="circle" />

        <div className="meta min-w-0">
          <div className="truncate font-medium whitespace-nowrap">
            {row.name}
          </div>

          {row.email && (
            <div className="text-muted-foreground max-w-42.5 truncate text-xs whitespace-nowrap">
              {row.email}
            </div>
          )}
        </div>
      </div>
    ),
  },

  {
    header: "Company",
    className: "w-[21%] text-muted-foreground",
    accessorKey: "company",
  },

  {
    header: "Phone",
    className: "w-[22%] text-muted-foreground",
    cell: (row) => (
      <span className="whitespace-nowrap">{formatPhone(row.phone)}</span>
    ),
  },

  {
    header: "Created",
    hideBelow: "lg",
    className: "w-[14%] text-muted-foreground",
    cell: (row) => (
      <span className="whitespace-nowrap">{formatDate(row.createdAt)}</span>
    ),
  },

  {
    header: "Status",
    className: "w-[13%]",
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
];
