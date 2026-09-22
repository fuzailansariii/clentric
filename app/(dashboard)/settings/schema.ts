import { z } from "zod";

export const settingsSchema = z.object({
  name: z
    .string()
    .trim()
    .max(120, "Name must be 120 characters or fewer")
    .optional(),
  /** Hex colour for the branding strip on public proposal pages. */
  brandColor: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Use a hex colour like #3454d1")
    .optional()
    .or(z.literal("")),
  /**
   * Free text — bank, PayPal or Wise details, copied onto invoices. Never
   * card data, and never sent to a payment provider.
   */
  paymentDetails: z
    .string()
    .trim()
    .max(2000, "Payment details are too long")
    .optional(),
  testimonialQuote: z
    .string()
    .trim()
    .max(600, "Testimonial is too long")
    .optional(),
  testimonialAuthor: z
    .string()
    .trim()
    .max(120, "Author name is too long")
    .optional(),
});

export type SettingsFormInput = z.input<typeof settingsSchema>;
export type SettingsFormOutput = z.output<typeof settingsSchema>;
