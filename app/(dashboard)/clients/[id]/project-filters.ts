import type { ProjectRow } from "@/src/db/schema/projects";
import { ProjectStatus } from "../../projects/project-status-config";

export function filterProjects(
  projects: ProjectRow[],
  search: string,
  status: ProjectStatus | "all",
): ProjectRow[] {
  const query = search.trim().toLowerCase();

  return projects.filter((project) => {
    const matchesSearch =
      query === "" || project.title.toLowerCase().includes(query);
    const matchesStatus = status === "all" || project.status === status;
    return matchesSearch && matchesStatus;
  });
}
