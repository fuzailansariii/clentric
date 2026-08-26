import { z } from "zod";

export const milestoneSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(150),
  dueDate: z.string().optional().or(z.literal("")),
});

export type MilestoneInput = z.infer<typeof milestoneSchema>;

export const milestoneIdSchema = z.uuid();
