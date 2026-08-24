"use client";

import { StatusBadge } from "@/components/ui/status-badge";
import { projectStatusConfig } from "./project-status-config";
import { formatCurrency } from "@/lib/format-currency";
import { formatDate } from "@/lib/format-date";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { ProjectListItem } from "./queries";
import { ProjectRowActions } from "./project-row-actions";

export function renderProjectMobileCard(row: ProjectListItem) {
  const config = projectStatusConfig[row.status];

  return (
    <div className="flex flex-col gap-3 px-4.5 py-3.5">
      {/* Top: Title + Budget */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">{row.title}</div>
          <div className="mt-1">
            <StatusBadge
              status={config.variant}
              className={config.dim ? "opacity-60" : undefined}
            >
              {config.label}
            </StatusBadge>
          </div>
        </div>

        <div className="shrink-0 font-medium">{formatCurrency(row.budget)}</div>
      </div>

      {/* Client + milestone progress */}
      <div className="flex flex-col gap-2">
        {row.clientName && (
          <div className="flex min-w-0 items-center gap-2">
            <AvatarInitials
              name={row.clientName}
              variant="colored"
              size="sm"
              shape="square"
            />
            <span className="text-muted-foreground truncate text-xs">
              {row.clientName}
            </span>
          </div>
        )}

        {row.totalMilestones > 0 ? (
          <div className="flex items-center gap-2">
            <div className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full">
              <div
                className="bg-primary h-full rounded-full transition-all"
                style={{ width: `${row.progress}%` }}
              />
            </div>
            <span className="text-muted-foreground shrink-0 font-mono text-[11px]">
              {row.completedMilestones}/{row.totalMilestones}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground text-xs">No milestones yet</span>
        )}
      </div>

      {/* Deadline + actions */}
      <div className="flex items-center justify-between gap-3">
        <div className="text-muted-foreground text-xs">
          {row.deadline ? formatDate(row.deadline) : "No deadline"}
        </div>

        <ProjectRowActions project={row} />
      </div>
    </div>
  );
}
