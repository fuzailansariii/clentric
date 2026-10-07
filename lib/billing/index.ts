import "server-only";
import { dodoProvider } from "./dodo";

// The rest of the app imports billing from here only; swapping providers
// means a new adapter next to dodo.ts and one line below.
export const billing = dodoProvider;

export { billingEnv, billingEnforced } from "./env";
export { getEffectivePlan, type BillingState } from "./plan";
export { applyBillingEvent } from "./events";
export type { BillingInterval, NormalizedEvent, PlanId } from "./types";
