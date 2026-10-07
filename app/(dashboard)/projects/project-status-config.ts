import type { z } from "zod";
import { projectStatusEnum } from "./schema";

export type ProjectStatus = z.infer<typeof projectStatusEnum>;

export const projectStatusConfig: Record<
  ProjectStatus,
  {
    label: string;
    variant: "info" | "success" | "warning" | "danger" | "neutral";
    dim?: boolean;
    dotColor?: string;
  }
> = {
  not_started: {
    label: "Not Started",
    variant: "neutral",
    dotColor: "bg-muted-foreground",
  },
  in_progress: {
    label: "In Progress",
    variant: "success",
    dotColor: "bg-blue-500",
  },
  on_hold: {
    label: "On Hold",
    variant: "warning",
    dotColor: "bg-amber-500",
  },
  completed: {
    label: "Completed",
    variant: "info",
    dotColor: "bg-emerald-500",
  },
};
