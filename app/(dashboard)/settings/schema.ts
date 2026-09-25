import { z } from "zod";
import { normalizeWebsite } from "@/lib/format-website";
import { PROFESSIONS } from "@/lib/professions";
import {
  PAYMENT_METHOD_FIELDS,
  PAYMENT_METHOD_TYPES,
} from "@/lib/payment-methods";

export const profileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "Enter your full name")
    .max(100, "Name must be 100 characters or fewer"),
  profession: z.enum(PROFESSIONS, "Choose what you do").optional(),
});

export type ProfileFormInput = z.input<typeof profileSchema>;
export type ProfileFormOutput = z.output<typeof profileSchema>;

export const businessSchema = z.object({
  businessName: z
    .string()
    .trim()
    .max(120, "Business name must be 120 characters or fewer"),
  website: z
    .string()
    .trim()
    .max(200, "Website is too long")
    .transform((value, ctx) => {
      if (!value) return "";
      const normalized = normalizeWebsite(value);
      if (!normalized) {
        ctx.addIssue({
          code: "custom",
          message: "Enter a website like chenstudio.dev",
        });
        return z.NEVER;
      }
      return normalized;
    }),
  businessEmail: z
    .string()
    .trim()
    .max(254, "Email is too long")
    .refine(
      (value) => value === "" || z.email().safeParse(value).success,
      "Enter a valid email",
    ),
  taxId: z.string().trim().max(50, "Tax ID must be 50 characters or fewer"),
  address: z.string().trim().max(300, "Address is too long"),
});

export type BusinessFormInput = z.input<typeof businessSchema>;
export type BusinessFormOutput = z.output<typeof businessSchema>;

export const paymentMethodFormSchema = z.object({
  type: z.enum(PAYMENT_METHOD_TYPES),
  accountHolder: z.string().trim().max(120, "Name is too long"),
  bankName: z.string().trim().max(120, "Bank name is too long"),
  accountNumber: z.string().trim().max(40, "Account number is too long"),
  routingCode: z.string().trim().max(40, "Code is too long"),
  paypalEmail: z.string().trim().max(254, "Email is too long"),
  wiseAccount: z.string().trim().max(120, "Too long"),
  upiId: z.string().trim().max(100, "UPI ID is too long"),
  showOnInvoices: z.boolean().optional(),
});

export const paymentMethodSchema = paymentMethodFormSchema.superRefine(
  (value, ctx) => {
    for (const field of PAYMENT_METHOD_FIELDS[value.type]) {
      if (!value[field.name]) {
        ctx.addIssue({
          code: "custom",
          path: [field.name],
          message: `${field.label} is required`,
        });
      }
    }

    if (
      value.type === "bank" &&
      value.accountNumber &&
      !/^[A-Za-z0-9 -]+$/.test(value.accountNumber)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["accountNumber"],
        message: "Use letters, digits and spaces only",
      });
    }

    if (
      value.type === "paypal" &&
      value.paypalEmail &&
      !z.email().safeParse(value.paypalEmail).success
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["paypalEmail"],
        message: "Enter a valid email",
      });
    }

    if (
      value.type === "upi" &&
      value.upiId &&
      !/^[\w.-]{2,}@[A-Za-z][\w.-]*$/.test(value.upiId)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["upiId"],
        message: "Enter a UPI ID like yourname@okhdfc",
      });
    }
  },
);

export type PaymentMethodFormInput = z.input<typeof paymentMethodFormSchema>;
export type PaymentMethodFormOutput = z.output<typeof paymentMethodFormSchema>;

export const paymentMethodVisibilitySchema = z.object({
  type: z.enum(PAYMENT_METHOD_TYPES),
  show: z.boolean(),
});

/** "Other payment instructions" — stored in users.payment_details. */
export const paymentInstructionsSchema = z.object({
  instructions: z
    .string()
    .trim()
    .max(2000, "Instructions must be 2000 characters or fewer"),
});

export type PaymentInstructionsInput = z.input<
  typeof paymentInstructionsSchema
>;
export type PaymentInstructionsOutput = z.output<
  typeof paymentInstructionsSchema
>;
