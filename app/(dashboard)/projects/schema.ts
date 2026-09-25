import { z } from "zod";
import { projectStatusEnum as projectStatusPgEnum } from "@/src/db/schema/projects";
import { milestoneStatusEnum as milestoneStatusPgEnum } from "@/src/db/schema/milestones";
import { hourlyRateSchema } from "@/lib/hourly-rate-schema";

export const projectStatusEnum = z.enum(projectStatusPgEnum.enumValues);

/** "" (no deadline) or a YYYY-MM-DD date. */
const deadlineSchema = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value),
    "Invalid deadline",
  );

/**
 * True unless the date is before yesterday (UTC). A day of slack because
 * this runs on the server, in UTC: someone west of UTC picking their own
 * "today" in the evening is already on UTC's tomorrow. Compared as strings,
 * which YYYY-MM-DD sorts correctly for, so no Date parsing shifts the day.
 */
function isNotPast(value: string) {
  if (value === "") return true;
  const yesterday = new Date(Date.now() - 86_400_000)
    .toISOString()
    .slice(0, 10);
  return value >= yesterday;
}

/**
 * Plain object schema (no .refine on the object) so the edit schema can
 * .omit()/.partial() it. The deadline accepts any date here; only creating
 * a project refuses a past one (see projectSchema).
 */
export const projectObjectSchema = z.object({
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
  deadline: deadlineSchema.optional(),
  status: projectStatusEnum,
  // Overrides the client's rate when prefilling hour lines on invoices.
  hourlyRate: hourlyRateSchema,
});

/** Creating a project: a new deadline can't already have passed. */
export const projectSchema = projectObjectSchema.extend({
  deadline: deadlineSchema
    .refine(isNotPast, "Deadline can't be in the past")
    .optional(),
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

/**
 * Editing a project. No past-date check: a project whose deadline has
 * passed must still be editable without first moving the deadline.
 */
export const editableProjectsSchema = projectObjectSchema
  .omit({ clientId: true })
  .partial();

export type ProjectFormInput = z.input<typeof projectSchema>;
export type ProjectInput = z.infer<typeof projectSchema>;
export type EditableProjectInput = z.infer<typeof editableProjectsSchema>;
