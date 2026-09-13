import { FolderIcon } from "lucide-react";
import type { Column } from "@/components/data-table/data-table.types";
import { RowIdentity } from "@/components/data-table/row-parts";
import { IconTile } from "@/components/ui/icon-tile";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/format-currency";
import { formatDate } from "@/lib/format-date";
import { cn } from "@/lib/utils";
import { MilestoneProgress } from "./milestone-progress";
import { getProjectDeadlineLabel } from "./project-deadline-label";
import { ProjectRowActions } from "./project-row-actions";
import { projectStatusConfig } from "./project-status-config";
import type { ProjectListItem } from "./queries";

// Visibility by table width — always: Project (with client underneath),
// Status, Budget · 860px+: Progress · 1000px+: Deadline. Budget is never
// hidden: it's the figure people look for first.
export const projectColumns: Column<ProjectListItem>[] = [
  {
    header: "Project",
    className: "min-w-[12rem] max-w-[18rem]",
    cell: (row) => (
      <RowIdentity
        leading={
          <IconTile tone={projectStatusConfig[row.status].variant}>
            <FolderIcon />
          </IconTile>
        }
        title={row.title}
        subtitle={row.clientName ?? "No client"}
      />
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
          variant="soft"
          className={config.dim ? "opacity-60" : undefined}
        >
          {config.label}
        </StatusBadge>
      );
    },
  },
  {
    header: "Budget",
    className: "whitespace-nowrap text-right",
    cell: (row) => (
      <span className="font-semibold tabular-nums">
        {formatCurrency(row.budget)}
      </span>
    ),
  },
  {
    header: "Progress",
    hideBelow: "lg",
    className: "whitespace-nowrap",
    cell: (row) => (
      <MilestoneProgress
        completed={row.completedMilestones}
        total={row.totalMilestones}
        progress={row.progress}
      />
    ),
  },
  {
    header: "Deadline",
    hideBelow: "xl",
    className: "whitespace-nowrap",
    cell: (row) => {
      if (!row.deadline) {
        return <span className="text-muted-foreground">—</span>;
      }

      const deadline = getProjectDeadlineLabel(row);
      return (
        <div>
          <div>{formatDate(row.deadline)}</div>
          <div
            className={cn(
              "text-[12.5px]",
              deadline.late ? "text-danger-600" : "text-muted-foreground",
            )}
          >
            {deadline.label}
          </div>
        </div>
      );
    },
  },
  {
    header: <span className="sr-only">Actions</span>,
    revealOnHover: true,
    className: "w-[1%] whitespace-nowrap text-right",
    cell: (row) => <ProjectRowActions project={row} />,
  },
];
