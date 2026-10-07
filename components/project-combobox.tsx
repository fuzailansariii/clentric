"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Combobox } from "./combobox";

export type ProjectOption = {
  /** Used to default a new invoice's currency. */
  currency?: string;
  id: string;
  title: string;
  clientId: string;
  /** Overrides the client's hourly rate when prefilling invoice hour lines. */
  hourlyRate: string | null;
};

type ProjectComboboxProps = {
  projects: ProjectOption[];
  value: string;
  onChange: (projectId: string) => void;
  error?: string;
  disabled?: boolean;
};

export function ProjectCombobox({
  projects,
  value,
  onChange,
  error,
  disabled,
}: ProjectComboboxProps) {
  return (
    <Combobox<ProjectOption>
      items={projects}
      value={value}
      onChange={onChange}
      error={error}
      disabled={disabled}
      label="Project (optional)"
      placeholder={disabled ? "Select a client first" : "Select a project"}
      emptyText="No project found."
      getId={(project) => project.id}
      getSearchValue={(project) => project.title}
      renderSelected={(project) => (
        <span className="truncate">{project.title}</span>
      )}
      renderItem={(project, isSelected) => (
        <>
          <span className="truncate">{project.title}</span>
          <Check
            className={cn(
              "ml-auto h-4 w-4 shrink-0",
              isSelected ? "opacity-100" : "opacity-0",
            )}
          />
        </>
      )}
    />
  );
}
