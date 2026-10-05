import type { BillingCycle, PlanId as AnyPlanId } from "@/lib/plans";

/** Billing only ever resolves to these two; Agency isn't sold yet. */
export type PlanId = Extract<AnyPlanId, "free" | "pro">;
export type BillingInterval = BillingCycle;

/** Statuses as stored in subscriptions.status (mirrors the provider's set). */
export const SUBSCRIPTION_STATUSES = [
  "pending",
  "active",
  "past_due",
  "on_hold",
  "paused",
  "cancelled",
  "expired",
  "failed",
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

/** A provider webhook, reduced to what billing needs. */
export type NormalizedEvent = {
  id: string;
  type: string;
  occurredAt: Date;
  /** Present only for subscription events: the provider's full snapshot. */
  subscription: {
    customerId: string;
    subscriptionId: string;
    productId: string;
    status: SubscriptionStatus;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: Date | null;
    /** Our user id, if checkout metadata carried it through. */
    metadataUserId: string | null;
  } | null;
};

export interface BillingProvider {
  name: string;
  createCustomer(input: { email: string; name: string; userId: string }): Promise<{
    customerId: string;
  }>;
  createCheckout(input: {
    customerId: string;
    userId: string;
    interval: BillingInterval;
    returnUrl: string;
  }): Promise<{ url: string }>;
  createPortalLink(input: {
    customerId: string;
    returnUrl: string;
  }): Promise<{ url: string }>;
  cancelAtPeriodEnd(subscriptionId: string): Promise<void>;
  /** Throws if the signature is wrong. */
  verifyWebhook(rawBody: string, headers: Record<string, string>): NormalizedEvent;
  intervalForProduct(productId: string): BillingInterval | null;
}
