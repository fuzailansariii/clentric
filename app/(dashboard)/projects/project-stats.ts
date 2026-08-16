import { ProjectRow } from "../clients/client-columns";

export type ProjectStats = {
  total: number;
  active: number;
  completed: number;
  totalBilledCents: number;
};

export function computeProjectStats(projects: ProjectRow[]): ProjectStats {
  let active = 0;
  let completed = 0;
  let totalBilledCents = 0;

  for (const project of projects) {
    if (project.status === "in_progress") active++;
    if (project.status === "completed") completed++;

    totalBilledCents += Math.round(Number(project.budget) * 100);
  }

  return {
    total: projects.length,
    active,
    completed,
    totalBilledCents,
  };
}
