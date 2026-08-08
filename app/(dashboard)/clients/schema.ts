import { z } from "zod";

export const clientStatusEnum = z.enum([
  "lead",
  "active",
  "inactive",
  "archived",
]);

export const clientSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.email("Invalid email").optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional(),
  company: z.string().trim().max(100).optional(),
  country: z.string().length(2, "Select a country").optional(),
  notes: z.string().trim().max(2000).optional(),
  status: clientStatusEnum.default("active"),
});

export const clientIdSchema = z.uuid();

export type ClientFormInput = z.input<typeof clientSchema>;
export type ClientInput = z.infer<typeof clientSchema>;
