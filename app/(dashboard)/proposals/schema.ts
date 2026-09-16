import { z } from "zod";

export const lineItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.coerce.number().positive().default(1),
  rate: z.coerce.number().nonnegative(),
});

export const createProposalSchema = z.object({
  clientId: z.uuid(),
  title: z.string().min(1, "Title is required"),
  content: z.string().optional(),
  currency: z.string().default("USD"),
  taxRate: z.coerce.number().min(0).max(100).default(0),
  items: z.array(lineItemSchema).min(1, "Add at least one line item"),
});
