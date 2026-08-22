import { z } from "zod";
import { projectStatusEnum as projectStatusPgEnum } from "@/src/db/schema/projects";

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
});

export const projectSearchParamsSchema = z.object({
  search: z.string().trim().max(200).optional(),
  status: projectStatusEnum.optional().catch(undefined),
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().max(100).catch(20),
});

export const projectIdSchema = z.uuid();
export const projectClientIdSchema = z.uuid();

export type ProjectFormInput = z.input<typeof projectSchema>;
export type ProjectInput = z.infer<typeof projectSchema>;
