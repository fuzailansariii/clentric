import { z } from "zod";

const billingEnvSchema = z.object({
  DODO_PAYMENTS_API_KEY: z.string().min(1),
  DODO_PAYMENTS_ENVIRONMENT: z.enum(["test_mode", "live_mode"]),
  DODO_PRODUCT_PRO_MONTHLY: z.string().min(1),
  DODO_PRODUCT_PRO_YEARLY: z.string().min(1),
  // Only the webhook route needs it; empty until the webhook is registered.
  DODO_PAYMENTS_WEBHOOK_SECRET: z.string().default(""),
  APP_URL: z.url().default("https://clentric.app"),
});

export type BillingEnv = z.infer<typeof billingEnvSchema>;

let cached: BillingEnv | null = null;

/**
 * Checked on first use, not at boot, so the app still runs (everyone on the
 * beta plan) on a host where billing isn't configured yet.
 */
export function billingEnv(): BillingEnv {
  if (cached) return cached;
  const parsed = billingEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Billing is not configured: check ${missing} in .env.`);
  }
  const env = { ...parsed.data, APP_URL: parsed.data.APP_URL.replace(/\/+$/, "") };
  if (env.DODO_PAYMENTS_ENVIRONMENT === "live_mode" && /localhost|127\.0\.0\.1/.test(env.APP_URL)) {
    throw new Error("Billing: live_mode is refused while APP_URL points at localhost.");
  }
  cached = env;
  return env;
}

/** Beta switch: paid plans only gate anything when this is exactly "true". */
export function billingEnforced(): boolean {
  return process.env.BILLING_ENFORCED === "true";
}
