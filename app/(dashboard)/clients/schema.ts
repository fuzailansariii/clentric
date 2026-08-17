import { z } from "zod";
import { clientStatusEnum as clientStatusPgEnum } from "@/src/db/schema/clients";

export const clientStatusEnum = z.enum(clientStatusPgEnum.enumValues);

export const clientSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.email("Invalid email").optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional(),
  company: z.string().trim().max(100).optional(),
  country: z.string().length(2, "Select a country").optional(),
  notes: z.string().trim().max(2000).optional(),
  status: clientStatusEnum,
});

export const clientIdSchema = z.uuid();

export const clientSearchParamsSchema = z.object({
  search: z.string().trim().max(200).optional(),
  status: clientStatusEnum.optional().catch(undefined),
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().max(100).catch(20),
});

export type ClientInput = z.infer<typeof clientSchema>;
export type ClientSearchParams = z.input<typeof clientSearchParamsSchema>;
