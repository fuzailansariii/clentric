import type { z } from "zod";
import { projectStatusEnum } from "./schema";

export type ProjectStatus = z.infer<typeof projectStatusEnum>;

export const projectStatusConfig: Record<
  ProjectStatus,
  {
    label: string;
    variant: "info" | "success" | "warning" | "danger" | "neutral";
    dim?: boolean;
  }
> = {
  not_started: { label: "Draft", variant: "neutral" },
  in_progress: { label: "Active", variant: "success" },
  on_hold: { label: "On Hold", variant: "warning" },
  completed: { label: "Completed", variant: "info" },
};
