import { z } from "zod";
import { clientIdSchema } from "../clients/schema";
import { projectIdSchema } from "../projects/schema";

export const invoiceLineSchema = z.object({
  description: z.string().min(1, "Item Description is required"),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  rate: z.coerce.number().positive("Rate must be a positive number"),
});

export const invoiceIdSchema = z.uuid();
const invoiceDateSchema = z.iso.date();

export const invoiceObjectSchema = z.object({
  clientId: z.string().trim().min(1, "Client is required").pipe(clientIdSchema),
  projectId: projectIdSchema.optional(),
  issueDate: invoiceDateSchema,
  dueDate: invoiceDateSchema,
  taxRate: z.coerce
    .number()
    .min(0, "Tax rate cannot be negative")
    .max(100, "Tax rate cannot be exceed 100"),
  lineItems: z
    .array(invoiceLineSchema)
    .min(1, "At least one line item is required"),
});

export const invoiceSchema = invoiceObjectSchema.refine(
  (data) => data.dueDate >= data.issueDate,
  {
    error: "Due date must be on or after issue date",
    path: ["dueDate"],
  },
);

export type InvoiceFormInput = z.input<typeof invoiceSchema>;
export type InvoiceFormOutput = z.output<typeof invoiceSchema>;
