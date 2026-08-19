import type { Column } from "@/components/data-table/data-table.types";
import { formatDate } from "@/lib/format-date";
import { projectStatusConfig } from "./project-status-config";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/format-currency";
import { MoreVerticalIcon } from "lucide-react";
import type { ProjectRow } from "@/src/db/schema/projects";
import { ProjectListItem } from "./queries";

export const projectColumns: Column<ProjectListItem>[] = [
  {
    header: "Projects",
    accessorKey: "title",
    cell: (row) => (
      <div>
        <div className="font-medium">{row.title}</div>
        <div className="text-muted-foreground text-xs">
          Started {formatDate(row.createdAt)}
        </div>
      </div>
    ),
  },
  {
    header: "Status",
    accessorKey: "status",
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
    cell: (row) => formatCurrency(row.budget),
    hideBelow: "sm",
  },
  {
    header: "Deadline",
    accessorKey: "deadline",
    cell: (row) => (row.deadline ? formatDate(row.deadline) : "—"),
    hideBelow: "md",
  },
  {
    header: "Actions",
    className: "text-right",
    cell: () => (
      <button
        type="button"
        aria-label="Project actions"
        className="text-muted-foreground hover:text-foreground inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors"
      >
        <MoreVerticalIcon className="h-4 w-4" />
      </button>
    ),
  },
];
