import type { z } from "zod";
import { clientStatusEnum } from "./schema";

export type ClientStatus = z.infer<typeof clientStatusEnum>;

export const clientStatusConfig: Record<
  ClientStatus,
  {
    label: string;
    variant: "info" | "success" | "warning" | "danger" | "neutral";
    dim?: boolean;
  }
> = {
  lead: { label: "Lead", variant: "warning" },
  active: { label: "Active", variant: "success" },
  inactive: { label: "Inactive", variant: "neutral" },
  archived: { label: "Archived", variant: "neutral", dim: true },
};
