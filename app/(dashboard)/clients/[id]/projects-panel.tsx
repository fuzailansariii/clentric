"use client";
import { useState, useMemo } from "react";
import { DataTable } from "@/components/data-table/data-table";
import { StatsCards } from "@/components/ui/stats-cards";
import { Pagination } from "@/components/ui/pagination";
import { CustomButton } from "@/components/ui/custom-button";
import { PlusIcon } from "lucide-react";
import { formatCurrency } from "@/lib/format-currency";
import { ProjectStatus } from "../../projects/project-status-config";
import { computeProjectStats } from "../../projects/project-stats";
import { usePagination } from "@/hooks/use-pagination";
import { ProjectFiltersBar } from "../../projects/project-filters-bar";
import { filterProjects } from "./project-filters";
import { projectColumns } from "../../projects/projects-columns";
import { cn } from "@/lib/utils";
import type { ProjectListItem } from "../../projects/queries";

const PAGE_SIZE = 10;

export function ProjectsPanel({
  projects,
  className,
}: {
  projects: ProjectListItem[];
  className?: string;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ProjectStatus | "all">("all");

  const filtered = useMemo(
    () => filterProjects(projects, search, status),
    [projects, search, status],
  );

  const stats = useMemo(() => computeProjectStats(filtered), [filtered]);
  const isFiltering = search.trim() !== "" || status !== "all";

  const { page, setPage, totalPages, paginatedItems } = usePagination(
    filtered,
    PAGE_SIZE,
  );

  return (
    <div className={cn("border-border rounded-xl border", className)}>
      <StatsCards
        items={[
          {
            label: "Total Projects",
            value: stats.total,
            hint: isFiltering ? "Matching filters" : "All time",
          },
          { label: "Active", value: stats.active, hint: "In progress" },
          { label: "Completed", value: stats.completed, hint: "Delivered" },
          {
            label: "Total Billed",
            value: formatCurrency((stats.totalBilledCents / 100).toFixed(2)),
            hint: isFiltering ? "Matching filters" : "Across all projects",
          },
        ]}
      />

      <div className="border-border flex items-center justify-between border-b px-5 py-1">
        <ProjectFiltersBar
          search={search}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          status={status}
          onStatusChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
        />
        <CustomButton variant="primary" size="sm" className="gap-1.5">
          <PlusIcon className="h-3.5 w-3.5" />
          New Project
        </CustomButton>
      </div>

      <DataTable
        columns={projectColumns}
        data={paginatedItems}
        getRowId={(row) => row.id}
        emptyMessage={
          isFiltering ? "No projects match your filters." : "No projects yet."
        }
        className="border-none"
      />

      {filtered.length > 0 && (
        <div className="flex items-center justify-between px-5 py-3.5">
          <span className="text-muted-foreground text-xs">
            Showing {paginatedItems.length} of {filtered.length} projects
          </span>
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
