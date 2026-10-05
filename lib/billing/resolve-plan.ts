import type { BillingInterval, PlanId, SubscriptionStatus } from "./types";

/** Extra days of Pro after a failed renewal before access drops. */
export const ON_HOLD_GRACE_DAYS = 3;
const DAY_MS = 86_400_000;

export type PlanSource = "beta" | "grant" | "subscription" | "free";

export type SubscriptionSnapshot = {
  status: SubscriptionStatus | null;
  interval: BillingInterval | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: Date | null;
};

export type GrantSnapshot = { expiresAt: Date | null };

export type EffectivePlan = {
  plan: PlanId;
  source: PlanSource;
  /** Set when Pro comes from a paid subscription. */
  subscription: SubscriptionSnapshot | null;
  grant: GrantSnapshot | null;
};

/**
 * When Pro access ends for a subscription that has stopped paying: period
 * end + grace when on hold, period end when cancelled. Null otherwise.
 */
export function proAccessEndsAt(sub: SubscriptionSnapshot): Date | null {
  const end = sub.currentPeriodEnd?.getTime();
  if (end === undefined) return null;
  if (sub.status === "on_hold") return new Date(end + ON_HOLD_GRACE_DAYS * DAY_MS);
  if (sub.status === "cancelled") return new Date(end);
  return null;
}

/** True while a paid subscription still gives Pro. */
export function subscriptionGivesPro(
  sub: SubscriptionSnapshot,
  now: Date,
): boolean {
  switch (sub.status) {
    case "active":
    case "past_due": // the provider's own retry window
      return true;
    case "on_hold":
    case "cancelled": {
      const until = proAccessEndsAt(sub);
      return until !== null && now < until;
    }
    default:
      return false;
  }
}

/** Beta switch, then a gift, then a paid subscription, else Free. */
export function resolvePlan(input: {
  enforced: boolean;
  grant: GrantSnapshot | null;
  subscription: SubscriptionSnapshot | null;
  now: Date;
}): EffectivePlan {
  const { enforced, grant, subscription, now } = input;
  const paid =
    subscription && subscriptionGivesPro(subscription, now) ? subscription : null;

  if (!enforced) return { plan: "pro", source: "beta", subscription: paid, grant };
  if (grant) return { plan: "pro", source: "grant", subscription: paid, grant };
  if (paid) return { plan: "pro", source: "subscription", subscription: paid, grant: null };
  return { plan: "free", source: "free", subscription: null, grant: null };
}
