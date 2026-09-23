import { z } from "zod";
import { clientIdSchema } from "../clients/schema";
import { proposalStatusEnum as proposalStatusPgEnum } from "@/src/db/schema/proposals";

export const proposalIdSchema = z.uuid();

/** 0 means the link never expires. */
export const EXPIRY_OPTIONS = [
  { value: "0", label: "No expiry" },
  { value: "7", label: "7 days" },
  { value: "14", label: "14 days" },
  { value: "30", label: "30 days" },
  { value: "60", label: "60 days" },
] as const;

export const EXPIRY_DEFAULT_DAYS = 14;

export const lineItemSchema = z.object({
  description: z.string().trim().min(1, "Description is required"),
  quantity: z.coerce
    .number()
    .positive("Quantity must be greater than 0")
    .default(1),
  rate: z.coerce.number().nonnegative("Rate cannot be negative"),
});

export const milestoneSchema = z.object({
  /**
   * Optional: quoting a simple one-line job should not force someone to
   * invent a stage name. An unnamed stage renders its lines with no heading,
   * which every surface already handles — proposal_items.milestone_id is
   * nullable and the detail and client pages group unnamed items already.
   */
  name: z
    .string()
    .trim()
    .max(200, "Milestone name must be 200 characters or fewer")
    .optional(),
  description: z
    .string()
    .trim()
    .max(2000, "Milestone description is too long")
    .optional(),
  items: z.array(lineItemSchema).min(1, "Add at least one line item"),
});

/**
 * Plain object schema, kept separate from anything refined so it stays
 * .extend()/.pick()-able - .refine() would strip those off.
 */
export const proposalObjectSchema = z.object({
  clientId: z.string().trim().min(1, "Client is required").pipe(clientIdSchema),
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or fewer"),
  content: z
    .string()
    .trim()
    .max(20000, "Proposal content is too long")
    .optional(),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .length(3, "Pick a currency")
    .default("USD"),
  taxRate: z.coerce
    .number()
    .min(0, "Tax rate cannot be negative")
    .max(100, "Tax rate cannot exceed 100")
    .default(0),
  /** 0 means no deposit is asked for. */
  depositPercent: z.coerce
    .number()
    .min(0, "Deposit cannot be negative")
    .max(100, "Deposit cannot exceed 100%")
    .default(0),
  /**
   * How long the public link stays openable, in days. 0 means no expiry.
   * Stored as an absolute expiresAt, but the window is what the user chose,
   * so sending re-bases it - see sendProposalAction.
   */
  expiresInDays: z.coerce
    .number()
    .int("Pick one of the expiry options")
    .min(0)
    .max(365, "Expiry cannot be more than a year")
    .default(EXPIRY_DEFAULT_DAYS),
  milestones: z
    .array(milestoneSchema)
    .min(1, "Add at least one milestone")
    .max(20, "That is a lot of milestones - 20 is the limit"),
});

export const createProposalSchema = proposalObjectSchema;

export const updateProposalSchema = proposalObjectSchema.extend({
  proposalId: proposalIdSchema,
});

export const sendProposalSchema = z.object({
  proposalId: proposalIdSchema,
});

export const revokeProposalSchema = z.object({
  proposalId: proposalIdSchema,
});

export const duplicateProposalSchema = z.object({
  proposalId: proposalIdSchema,
});

export const startProjectSchema = z.object({
  proposalId: proposalIdSchema,
});

export const deleteProposalSchema = z.object({
  proposalId: proposalIdSchema,
});

export const proposalStatusFilterEnum = z.enum(proposalStatusPgEnum.enumValues);

export const proposalSearchParamsSchema = z.object({
  search: z.string().trim().max(200).optional(),
  status: proposalStatusFilterEnum.optional().catch(undefined),
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().max(100).catch(20),
});

// z.coerce fields mean the form's input type and the parsed output type
// differ, so both are exported and useForm is typed with each.
export type ProposalFormInput = z.input<typeof createProposalSchema>;
export type ProposalFormOutput = z.output<typeof createProposalSchema>;

export type UpdateProposalFormInput = z.input<typeof updateProposalSchema>;
export type UpdateProposalFormOutput = z.output<typeof updateProposalSchema>;
