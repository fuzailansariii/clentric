"use client";
import { SearchInput } from "@/components/ui/search-input";
import { FilterSelect } from "@/components/ui/filter-select";
import {
  projectStatusConfig,
  type ProjectStatus,
} from "./project-status-config";

type ProjectFiltersBarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  status: ProjectStatus | "all";
  onStatusChange: (value: ProjectStatus | "all") => void;
};

export function ProjectFiltersBar({
  search,
  onSearchChange,
  status,
  onStatusChange,
}: ProjectFiltersBarProps) {
  const statusOptions = Object.entries(projectStatusConfig).map(
    ([value, config]) => ({
      value: value as ProjectStatus,
      label: config.label,
    }),
  );

  return (
    <div className="flex items-center gap-2 px-5 py-3.5">
      <SearchInput
        value={search}
        onChange={onSearchChange}
        placeholder="Search projects..."
        className="max-w-xs flex-1"
      />
      <FilterSelect
        value={status}
        onChange={onStatusChange}
        options={statusOptions}
        allLabel="All statuses"
        ariaLabel="Filter by status"
      />
    </div>
  );
}
