import { formatDaysUntilDue } from "@/lib/format-due";
import type { ProjectListItem } from "./queries";

/** "Due in 20 days", "3 days late", "Delivered", "No deadline". */
export function getProjectDeadlineLabel(
  project: Pick<ProjectListItem, "status" | "deadline" | "daysUntilDeadline">,
): { label: string; late: boolean } {
  if (project.status === "completed") {
    return { label: "Delivered", late: false };
  }

  if (project.deadline === null || project.daysUntilDeadline === null) {
    return { label: "No deadline", late: false };
  }

  return {
    label: formatDaysUntilDue(project.daysUntilDeadline),
    late: project.daysUntilDeadline < 0,
  };
}
