"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PlusIcon } from "lucide-react";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { CustomButton } from "@/components/ui/custom-button";
import { StatsSummary } from "@/components/ui/stats-summary";
import { formatCurrency } from "@/lib/format-currency";
import {
  projectStatusConfig,
  type ProjectStatus,
} from "../../projects/project-status-config";
import ProjectTable from "../../projects/projects-table";
import type { ProjectListResult } from "../../projects/queries";

// The table sits inside the tab card: no frame of its own from 640px up
// (just a top rule under the stats), and a little padding on mobile where
// toolbar, list and pagination stack.
export const PANEL_TABLE_CLASS =
  "p-3 @[640px]:rounded-none @[640px]:border-0 @[640px]:border-t @[640px]:p-0";

/**
 * A client's projects, paged, searched and filtered on the server — the page
 * fetches only what this tab shows, so a client with hundreds of projects
 * doesn't ship them all to the browser.
 */
export function ProjectsPanel({ result }: { result: ProjectListResult }) {
  const isSearching = Boolean(useSearchParams().get("search"));

  const {
    projects,
    total,
    page,
    pageSize,
    totalPages,
    statusCounts,
    allCount,
    summary,
  } = result;

  return (
    <div className="min-w-0">
      {/* Counts live in the status filter chips below; only the budget total
          adds something they cannot show. */}
      <div className="px-3 py-3 @[640px]:px-5 @[640px]:py-4">
        <StatsSummary
          items={[
            {
              label: isSearching ? "Budget (matching)" : "Total Budget",
              value: formatCurrency(summary.budgetTotal),
            },
          ]}
        />
      </div>

      <ProjectTable
        data={projects}
        className={PANEL_TABLE_CLASS}
        toolbar={
          <DataTableToolbar
            searchPlaceholder="Search projects..."
            filters={[
              {
                key: "status",
                label: "Filter projects by status",
                allCount,
                options: (
                  Object.keys(projectStatusConfig) as ProjectStatus[]
                ).map((status) => ({
                  value: status,
                  label: projectStatusConfig[status].label,
                  count: statusCounts[status],
                })),
              },
            ]}
            actions={
              <Link href="/projects/new" className="shrink-0">
                <CustomButton
                  variant="primary"
                  size="sm"
                  className="h-9 gap-1.5 whitespace-nowrap @[640px]:h-8"
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                  New Project
                </CustomButton>
              </Link>
            }
          />
        }
        footer={
          <DataTablePagination
            page={page}
            pageSize={pageSize}
            total={total}
            totalPages={totalPages}
          />
        }
      />
    </div>
  );
}
