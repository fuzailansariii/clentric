"use client";

import { StatusBadge } from "@/components/ui/status-badge";
import { projectStatusConfig } from "./project-status-config";
import { formatCurrency } from "@/lib/format-currency";
import { formatDate } from "@/lib/format-date";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { ProjectListItem } from "./queries";
import { SquareArrowOutUpRight, SquarePen } from "lucide-react";

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

      {/* client name + prgress */}
      <div className="flex flex-col gap-2">
        {row.clientName && <AvatarInitials name={row.clientName} />}
        {row.totalMilestones / row.completedMilestones}
      </div>

      {/* Deadline */}
      <div className="flex items-center justify-center">
        <div className="text-muted-foreground text-xs">
          {row.deadline ? formatDate(row.deadline) : "No deadline"}
        </div>
        <div>
          <SquarePen />
          <SquareArrowOutUpRight />
        </div>
      </div>
    </div>
  );
}
