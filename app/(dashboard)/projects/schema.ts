import { z } from "zod";
import { projectStatusEnum as projectStatusPgEnum } from "@/src/db/schema/projects";
import { milestoneStatusEnum as milestoneStatusPgEnum } from "@/src/db/schema/milestones";
import { hourlyRateSchema } from "@/lib/hourly-rate-schema";

export const projectStatusEnum = z.enum(projectStatusPgEnum.enumValues);

export const projectSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(150),
  description: z.string().trim().max(2000).optional(),
  clientId: z.uuid("Please select a client"),
  budget: z
    .string()
    .trim()
    .min(1, "Budget is required")
    .regex(/^\d+(\.\d{1,2})?$/, "Invalid budget")
    .refine((value) => {
      const [whole] = value.split(".");
      return whole.length <= 10;
    }, "Budget is too large"),
  deadline: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value),
      "Invalid deadline",
    )
    .refine((value) => {
      if (value === "") return true;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return new Date(value) >= today;
    }, "Deadline can't be in the past")
    .optional(),
  status: projectStatusEnum,
  // Overrides the client's rate when prefilling hour lines on invoices.
  hourlyRate: hourlyRateSchema,
});

export const projectSearchParamsSchema = z.object({
  search: z.string().trim().max(200).optional(),
  status: projectStatusEnum.optional().catch(undefined),
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().max(100).catch(20),
});

export const projectIdSchema = z.uuid();
export const projectClientIdSchema = z.uuid();

export const milestoneIdSchema = z.uuid();
export const milestoneStatusEnum = z.enum(milestoneStatusPgEnum.enumValues);

// Plain object schema (no .refine) so the update schema can .partial() it.
export const milestoneSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Give the milestone a title")
    .max(200, "Keep the title under 200 characters"),
  // "" = no due date (the picker was cleared).
  dueDate: z.union([z.iso.date("Invalid due date"), z.literal("")]).optional(),
});

export const updateMilestoneSchema = milestoneSchema.partial();

export type MilestoneInput = z.input<typeof milestoneSchema>;

export const editableProjectsSchema = projectSchema
  .omit({ clientId: true })
  .partial();

export type ProjectFormInput = z.input<typeof projectSchema>;
export type ProjectInput = z.infer<typeof projectSchema>;
export type EditableProjectInput = z.infer<typeof editableProjectsSchema>;
