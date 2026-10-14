import { z } from "zod";
import {
  projectBillingEnum as projectBillingPgEnum,
  projectPricingEnum as projectPricingPgEnum,
  projectStatusEnum as projectStatusPgEnum,
} from "@/src/db/schema/projects";
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

/** "" or a stage price with up to two decimals. */
const milestoneAmountSchema = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || /^\d{1,10}(\.\d{1,2})?$/.test(value),
    "Enter an amount like 1500 or 1500.50",
  );

/** A milestone row on the project form; id is set for ones already saved. */
export const milestoneRowSchema = z.object({
  id: z.uuid().optional(),
  title: z.string().trim().max(200, "Keep the title under 200 characters"),
  dueDate: z.union([z.iso.date("Invalid due date"), z.literal("")]),
  amount: milestoneAmountSchema,
});

/** Blank rows are dropped; a row with a date or amount needs a title. */
const milestoneRowsSchema = z
  .array(milestoneRowSchema)
  .max(50, "Keep it to 50 milestones")
  .superRefine((rows, ctx) => {
    rows.forEach((row, index) => {
      if (!row.title && (row.dueDate || row.amount)) {
        ctx.addIssue({
          code: "custom",
          message: "Give the milestone a title",
          path: [index, "title"],
        });
      }
    });
  })
  .transform((rows) => rows.filter((row) => row.title));

/**
 * Plain object schema (no .refine on the object) so the edit schema can
 * .omit()/.partial() it. The deadline accepts any date here; only creating
 * a project refuses a past one (see projectSchema).
 */
export const projectObjectSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(150),
  description: z.string().trim().max(2000).optional(),
  clientId: z.uuid("Please select a client"),
  // No default here: inside .partial() Zod 4 would still fill it in on edits.
  pricing: z.enum(projectPricingPgEnum.enumValues),
  // Fixed: the agreed price. Hourly: an optional estimate; "" is stored as 0 (none).
  budget: z
    .string()
    .trim()
    .transform((value) => (value === "" ? "0" : value))
    .pipe(
      z
        .string()
        .regex(/^\d+(\.\d{1,2})?$/, "Invalid amount")
        .refine((value) => {
          const [whole] = value.split(".");
          return whole.length <= 10;
        }, "Amount is too large"),
    ),
  deadline: deadlineSchema.optional(),
  /** "" = not set. */
  startDate: z
    .union([z.iso.date("Invalid start date"), z.literal("")])
    .optional(),
  billing: z.enum(projectBillingPgEnum.enumValues).optional(),
  status: projectStatusEnum,
  // Overrides the client's rate when prefilling hour lines on invoices.
  hourlyRate: hourlyRateSchema,
  /** Left out = milestones untouched; on edit the list replaces the saved one. */
  milestones: milestoneRowsSchema.optional(),
});

/** A fixed price needs an amount; an hourly estimate may stay empty (stored as 0). */
const fixedPriceNeedsAmount = (data: {
  pricing?: "fixed" | "hourly";
  budget?: string;
}) =>
  data.pricing !== "fixed" ||
  data.budget === undefined ||
  Number(data.budget) > 0;
const fixedPriceError = { error: "Enter the agreed price", path: ["budget"] };

const projectFormObjectSchema = projectObjectSchema.extend({
  pricing: projectObjectSchema.shape.pricing.default("fixed"),
});

/** The edit page's form: same shape as creating, any deadline allowed. */
export const projectEditFormSchema = projectFormObjectSchema.refine(
  fixedPriceNeedsAmount,
  fixedPriceError,
);

/** Creating a project: a new deadline can't already have passed. */
export const projectSchema = projectFormObjectSchema
  .extend({
    deadline: deadlineSchema
      .refine(isNotPast, "Deadline can't be in the past")
      .optional(),
  })
  .refine(fixedPriceNeedsAmount, fixedPriceError);

/** The projects board: Active / Completed tabs (none = all), search and paging. */
export const projectBoardParamsSchema = z.object({
  search: z.string().trim().max(200).optional(),
  view: z.enum(["active", "completed"]).optional().catch(undefined),
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(1).max(60).catch(24),
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
  /** What the stage is worth; "" = not priced. */
  amount: milestoneAmountSchema.optional(),
});

export const updateMilestoneSchema = milestoneSchema.partial();

export type MilestoneInput = z.input<typeof milestoneSchema>;

/**
 * Editing a project. No past-date check: a project whose deadline has
 * passed must still be editable without first moving the deadline.
 */
export const editableProjectsSchema = projectObjectSchema
  .omit({ clientId: true })
  .partial()
  .refine(fixedPriceNeedsAmount, fixedPriceError);

export type ProjectFormInput = z.input<typeof projectSchema>;
export type ProjectInput = z.infer<typeof projectSchema>;
export type EditableProjectInput = z.infer<typeof editableProjectsSchema>;
export type EditableProjectFormInput = z.input<typeof editableProjectsSchema>;
