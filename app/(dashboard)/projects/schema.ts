import { z } from "zod";
import { projectStatusEnum as projectStatusPgEnum } from "@/src/db/schema/projects";

export const projectStatusEnum = z.enum(projectStatusPgEnum.enumValues);

export const projectSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(150),
  description: z.string().trim().max(2000).optional(),
  clientId: z.uuid(),
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
    .optional(),
  status: projectStatusEnum,
});

export const projectIdSchema = z.uuid();
export const projectClientIdSchema = z.uuid();

export type ProjectFormInput = z.input<typeof projectSchema>;
export type ProjectInput = z.infer<typeof projectSchema>;
