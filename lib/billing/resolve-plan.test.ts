import { describe, expect, it } from "vitest";
import {
  proAccessEndsAt,
  resolvePlan,
  subscriptionGivesPro,
  type SubscriptionSnapshot,
} from "./resolve-plan";

const now = new Date("2026-11-10T12:00:00Z");
const day = 86_400_000;
const sub = (over: Partial<SubscriptionSnapshot>): SubscriptionSnapshot => ({
  status: "active",
  interval: "monthly",
  cancelAtPeriodEnd: false,
  currentPeriodEnd: new Date(now.getTime() + 10 * day),
  ...over,
});

describe("subscriptionGivesPro", () => {
  it("active and past_due keep Pro", () => {
    expect(subscriptionGivesPro(sub({ status: "active" }), now)).toBe(true);
    expect(subscriptionGivesPro(sub({ status: "past_due" }), now)).toBe(true);
  });

  it("on_hold keeps Pro for 3 days after the period end", () => {
    const ended = (daysAgo: number) =>
      sub({ status: "on_hold", currentPeriodEnd: new Date(now.getTime() - daysAgo * day) });
    expect(subscriptionGivesPro(ended(2), now)).toBe(true);
    expect(subscriptionGivesPro(ended(4), now)).toBe(false);
  });

  it("cancelled keeps Pro until the period end, no extra days", () => {
    expect(subscriptionGivesPro(sub({ status: "cancelled" }), now)).toBe(true);
    const ended = sub({ status: "cancelled", currentPeriodEnd: new Date(now.getTime() - 1000) });
    expect(subscriptionGivesPro(ended, now)).toBe(false);
  });

  it("expired, failed, pending and paused give nothing", () => {
    for (const status of ["expired", "failed", "pending", "paused"] as const) {
      expect(subscriptionGivesPro(sub({ status }), now)).toBe(false);
    }
  });
});

describe("proAccessEndsAt", () => {
  it("is period end + 3 days on hold, period end when cancelled, null otherwise", () => {
    const end = new Date("2026-11-20T00:00:00Z");
    expect(proAccessEndsAt(sub({ status: "on_hold", currentPeriodEnd: end }))?.toISOString()).toBe(
      "2026-11-23T00:00:00.000Z",
    );
    expect(proAccessEndsAt(sub({ status: "cancelled", currentPeriodEnd: end }))).toEqual(end);
    expect(proAccessEndsAt(sub({ status: "active", currentPeriodEnd: end }))).toBeNull();
    expect(proAccessEndsAt(sub({ status: "on_hold", currentPeriodEnd: null }))).toBeNull();
  });
});

describe("resolvePlan", () => {
  it("beta switch gives everyone Pro", () => {
    const r = resolvePlan({ enforced: false, grant: null, subscription: null, now });
    expect(r).toMatchObject({ plan: "pro", source: "beta" });
  });

  it("a grant beats the subscription", () => {
    const r = resolvePlan({ enforced: true, grant: { expiresAt: null }, subscription: sub({}), now });
    expect(r).toMatchObject({ plan: "pro", source: "grant" });
    expect(r.subscription).not.toBeNull();
  });

  it("a live subscription gives Pro, a dead one Free", () => {
    expect(resolvePlan({ enforced: true, grant: null, subscription: sub({}), now }).source).toBe("subscription");
    const dead = resolvePlan({ enforced: true, grant: null, subscription: sub({ status: "expired" }), now });
    expect(dead).toMatchObject({ plan: "free", source: "free" });
  });
});
