import Link from "next/link";
import { CircleAlert, FolderOpen } from "lucide-react";

import type { ActiveProject } from "@/app/(dashboard)/dashboard/queries";
import { ClientCell } from "@/components/dashboard/client-cell";
import {
  DashboardCard,
  DashboardCardEmpty,
} from "@/components/dashboard/dashboard-card";
import { formatDaysUntilDue, formatShortDate } from "@/lib/format-due";
import { cn } from "@/lib/utils";

// Name | Client | Milestones | Next milestone; narrow cards keep name + milestones.
const GRID =
  "grid-cols-[minmax(0,1fr)_auto] @lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto_minmax(0,1.2fr)]";

/** `null` means the list failed to load. */
export function ActiveProjects({
  data,
}: {
  data: { items: ActiveProject[]; total: number } | null;
}) {
  return (
    <DashboardCard
      id="active-projects-title"
      title="Active projects"
      count={data?.total}
      viewAllHref="/projects"
    >
      {data === null ? (
        <DashboardCardEmpty
          icon={CircleAlert}
          title="Couldn't load projects"
          text="Refresh the page to try again."
        />
      ) : data.items.length === 0 ? (
        <DashboardCardEmpty
          icon={FolderOpen}
          title="No active projects"
          text="Projects in progress or about to start show up here."
        />
      ) : (
        <div className={cn("grid gap-x-4", GRID)}>
          <div
            aria-hidden="true"
            className="text-muted-foreground border-border col-span-full grid grid-cols-subgrid border-b px-4 py-2 text-xs"
          >
            <span>Name</span>
            <span className="hidden @lg:block">Client</span>
            <span>Milestones</span>
            <span className="hidden @lg:block">Next milestone</span>
          </div>
          <ul className="divide-border col-span-full grid grid-cols-subgrid divide-y">
            {data.items.map((project) => (
              <ProjectRow key={project.id} project={project} />
            ))}
          </ul>
        </div>
      )}
    </DashboardCard>
  );
}

function ProjectRow({ project }: { project: ActiveProject }) {
  const { totalMilestones: total, completedMilestones: done } = project;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  const days = project.daysUntilDeadline;
  const late = days !== null && days < 0;
  const next = project.nextMilestone;

  return (
    <li className="col-span-full grid grid-cols-subgrid">
      <Link
        href={`/projects/${project.id}`}
        className="hover:bg-muted/40 focus-visible:ring-ring col-span-full grid grid-cols-subgrid items-center px-4 py-3 transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
      >
        <div className="min-w-0">
          <p className="line-clamp-2 text-sm font-medium break-words">
            {project.title}
          </p>
          <ClientCell name={project.clientName} className="mt-1 @lg:hidden" />
        </div>

        <ClientCell name={project.clientName} className="hidden @lg:flex" />

        <div className="flex items-center gap-2">
          <span
            role="progressbar"
            aria-label="Milestones done"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            className="bg-foreground/10 h-1.5 w-12 overflow-hidden rounded-full"
          >
            <span
              className="bg-primary block h-full rounded-full"
              style={{ width: `${percent}%` }}
            />
          </span>
          <span className="text-muted-foreground w-7 text-xs tabular-nums">
            {total === 0 ? "—" : `${done}/${total}`}
          </span>
        </div>

        <div className="hidden min-w-0 @lg:block">
          <p
            className={cn("truncate text-sm", !next && "text-muted-foreground")}
          >
            {next ? next.title : total === 0 ? "No milestones" : "All done"}
          </p>
          <p
            className={cn(
              "truncate text-xs",
              late ? "text-danger-600" : "text-muted-foreground",
            )}
          >
            {late
              ? `Project ${formatDaysUntilDue(days)}`
              : next?.dueDate
                ? `Due ${formatShortDate(next.dueDate)}`
                : days !== null
                  ? `Project ${formatDaysUntilDue(days).toLowerCase()}`
                  : "No due date"}
          </p>
        </div>
      </Link>
    </li>
  );
}
