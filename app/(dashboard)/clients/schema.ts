import { z } from "zod";

export const clientStatusEnum = z.enum([
  "lead",
  "active",
  "inactive",
  "archived",
]);

export const clientSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.email("Invalid email").optional().or(z.literal("")),
  phone: z.string().max(30).optional(),
  company: z.string().max(100).optional(),
  country: z.string().max(60).optional(),
  notes: z.string().max(2000).optional(),
  status: clientStatusEnum.default("active"),
});

export const clientIdSchema = z.uuid();

export type ClientInput = z.infer<typeof clientSchema>;
