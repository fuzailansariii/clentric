"use client";

import { FolderIcon } from "lucide-react";
import { MobileListRow } from "@/components/data-table/row-parts";
import { IconTile } from "@/components/ui/icon-tile";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/format-currency";
import { cn } from "@/lib/utils";
import { DeadlineProgress } from "./deadline-progress";
import { getProjectDeadlineLabel } from "./project-deadline-label";
import { ProjectRowActions } from "./project-row-actions";
import { projectStatusConfig } from "./project-status-config";
import type { ProjectListItem } from "./queries";

// Mobile shows: title, client · deadline, budget, status, and a bar for time
// used until the deadline (hidden with no deadline, or once delivered).
// Created date and milestone counts stay on the detail page.
export function renderProjectMobileCard(row: ProjectListItem) {
  const config = projectStatusConfig[row.status];
  const deadline = getProjectDeadlineLabel(row);

  return (
    <MobileListRow
      leading={
        <IconTile tone={config.variant} size="md">
          <FolderIcon />
        </IconTile>
      }
      title={row.title}
      subtitle={
        <>
          {row.clientName ?? "No client"} ·{" "}
          <span className={cn(deadline.late && "text-danger-600")}>
            {deadline.label}
          </span>
        </>
      }
      trailing={
        <>
          <span className="text-sm font-semibold tabular-nums">
            {formatCurrency(row.budget, row.currency)}
          </span>
          <StatusBadge
            status={config.variant}
            variant="soft"
            size="sm"
            className={config.dim ? "opacity-60" : undefined}
          >
            {config.label}
          </StatusBadge>
        </>
      }
      actions={<ProjectRowActions project={row} />}
      footer={
        row.status !== "completed" && row.deadline ? (
          <DeadlineProgress
            daysUntilDeadline={row.daysUntilDeadline}
            deadlineSpanDays={row.deadlineSpanDays}
          />
        ) : null
      }
    />
  );
}
