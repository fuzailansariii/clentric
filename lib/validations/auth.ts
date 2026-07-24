import { z } from "zod";

export const emailValidation = z.email("Enter a valid email.");

export const registerSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters"),
  email: emailValidation,
});

export const loginSchema = z.object({
  email: emailValidation,
});

export const verificationCode = z
  .string()
  .length(6, "Invalid code")
  .regex(/^\d{6}$/, "Invalid code");
