import { z } from "zod";
import { CURRENCY_CODES } from "@/lib/currency-options";
import { clientIdSchema } from "../clients/schema";
import { projectIdSchema } from "../projects/schema";
import { invoiceItemUnitEnum as invoiceItemUnitPgEnum } from "@/src/db/schema/invoice-items";

/** Drafts may be half-written: a blank description or a 0 rate is checked only on Send. */
export const invoiceLineSchema = z.object({
  description: z
    .string()
    .trim()
    .max(2000, "Keep the description under 2000 characters"),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  rate: z.coerce.number().min(0, "Rate cannot be negative"),
  unit: z.enum(invoiceItemUnitPgEnum.enumValues).default("item"),
  /** The project milestone this line bills ("Invoice stage N"). */
  milestoneId: z.uuid().optional(),
});

export const invoiceIdSchema = z.uuid();
const invoiceDateSchema = z.iso.date();

/** Someone billed without setting up a client first; saved as a client with the invoice. */
export const newInvoiceClientSchema = z.object({
  name: z.string().trim().min(1, "Enter who you're billing").max(100),
  email: z.email("Invalid email").optional().or(z.literal("")),
});

export const invoiceObjectSchema = z.object({
  // "" while billing a new client (newClient) instead of a saved one.
  clientId: z.union([z.literal(""), clientIdSchema]).optional(),
  newClient: newInvoiceClientSchema.optional(),
  projectId: projectIdSchema.optional(),
  issueDate: invoiceDateSchema,
  dueDate: invoiceDateSchema,
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .refine((value) => CURRENCY_CODES.includes(value), "Pick a currency")
    .default("USD"),
  taxRate: z.coerce
    .number()
    .min(0, "Tax rate cannot be negative")
    .max(100, "Tax rate cannot be exceed 100"),
  lineItems: z
    .array(invoiceLineSchema)
    .min(1, "At least one line item is required"),
  /** Print the project's balance (fixed-price projects only). */
  showProjectBalance: z.boolean().default(false),
  /** Printed at the bottom of the invoice. Blank is stored as null. */
  notes: z
    .string()
    .trim()
    .max(2000, "Notes must be 2000 characters or fewer")
    .optional(),
});

export const invoiceSchema = invoiceObjectSchema
  .refine((data) => data.dueDate >= data.issueDate, {
    error: "Due date must be on or after issue date",
    path: ["dueDate"],
  })
  .refine((data) => Boolean(data.clientId) || Boolean(data.newClient), {
    error: "Choose a client or type who you're billing",
    path: ["clientId"],
  });

/** Editing keeps a saved client; new clients are only created with a new invoice. */
export const updateInvoiceSchema = invoiceObjectSchema
  .omit({ newClient: true })
  .extend({
    invoiceId: invoiceIdSchema,
    clientId: z
      .string()
      .trim()
      .min(1, "Client is required")
      .pipe(clientIdSchema),
  });

// Only paid -> sent; a sent invoice never goes back to draft.
const revertibleStatuses = ["sent"] as const;

export const updateInvoiceStatusSchema = z.object({
  invoiceId: invoiceIdSchema,
  status: z.enum(revertibleStatuses),
});

/** The invoices page: chip (none = all), search and paging. */
export const invoiceListParamsSchema = z.object({
  search: z.string().trim().max(200).optional(),
  view: z
    .enum(["draft", "open", "overdue", "paid"])
    .optional()
    .catch(undefined),
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(1).max(100).catch(20),
});

export type InvoiceFormInput = z.input<typeof invoiceSchema>;
export type InvoiceFormOutput = z.output<typeof invoiceSchema>;

export type UpdateInvoiceFormInput = z.input<typeof updateInvoiceSchema>;
export type UpdateInvoiceFormOutput = z.output<typeof updateInvoiceSchema>;
