import { z } from "zod";

/**
 * Optional default hourly rate, as typed into a client or project form.
 * "" clears it — the actions' normalize() turns "" into null. Kept as a
 * decimal string (same shape as a project budget) so money never passes
 * through a float before it reaches the decimal(12,2) column.
 */
export const hourlyRateSchema = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || /^\d{1,10}(\.\d{1,2})?$/.test(value),
    "Enter a rate like 85 or 85.50",
  )
  .refine(
    (value) => value === "" || Number(value) > 0,
    "Rate must be greater than 0",
  )
  .optional();
