import type { Column } from "@/components/data-table/data-table.types";
import { ProjectRowActions } from "./project-row-actions";
import { formatDate } from "@/lib/format-date";
import { projectStatusConfig } from "./project-status-config";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/format-currency";
import { ProjectListItem } from "./queries";
import { AvatarInitials } from "@/components/ui/avatar-initials";

export const projectColumns: Column<ProjectListItem>[] = [
  {
    header: "Projects",
    className: "min-w-[9rem] max-w-[14rem]",
    cell: (row) => (
      <div className="min-w-0">
        <div className="truncate font-medium">{row.title}</div>
        <div className="text-muted-foreground truncate text-xs">
          Started {formatDate(row.createdAt)}
        </div>
      </div>
    ),
  },
  {
    header: "Client",
    hideBelow: "md",
    className: "min-w-[7rem] max-w-[11rem]",
    cell: (row) => (
      <div className="flex min-w-0 items-center gap-1.5">
        {row.clientName && (
          <AvatarInitials
            name={row.clientName}
            shape="square"
            variant="colored"
            size="sm"
            className="shrink-0"
          />
        )}
        <span className="truncate">{row.clientName ?? "—"}</span>
      </div>
    ),
  },
  {
    header: "Status",
    className: "w-[1%] whitespace-nowrap",
    cell: (row) => {
      const config = projectStatusConfig[row.status];
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
    header: "Budget",
    accessorKey: "budget",
    hideBelow: "lg",
    className: "whitespace-nowrap",
    cell: (row) => formatCurrency(row.budget),
  },
  {
    header: "Deadline",
    accessorKey: "deadline",
    hideBelow: "xl",
    className: "whitespace-nowrap",
    cell: (row) => (row.deadline ? formatDate(row.deadline) : "—"),
  },
  {
    header: "Actions",
    className: "w-[1%] whitespace-nowrap text-right",
    cell: (row) => <ProjectRowActions project={row} />,
  },
];
