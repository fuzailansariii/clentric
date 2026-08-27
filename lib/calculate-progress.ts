import { MilestoneListItem } from "@/app/(dashboard)/projects/milestones-panel";

export function calculateProgress(list: MilestoneListItem[]): number {
  const total = list.length;
  if (total === 0) return 0;
  const completed = list.filter((m) => m.status === "completed").length;
  return Math.round((completed / total) * 100);
}
