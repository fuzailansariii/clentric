import "server-only";
import { cache } from "react";
import { and, eq, gt, isNull, or, sql } from "drizzle-orm";
import { db } from "@/src/db";
import { users } from "@/src/db/schema/users";
import { subscriptions } from "@/src/db/schema/subscriptions";
import { planGrants } from "@/src/db/schema/plan-grants";
import { AppError, logError } from "@/lib/errors";
import { billingEnforced } from "./env";
import { resolvePlan, type EffectivePlan } from "./resolve-plan";
import type { BillingInterval, SubscriptionStatus } from "./types";

export type BillingState = EffectivePlan & {
  /** The stored row, even when it no longer gives Pro (for warnings). */
  row: {
    customerId: string | null;
    subscriptionId: string | null;
    status: SubscriptionStatus | null;
    interval: BillingInterval | null;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: Date | null;
  } | null;
};

/**
 * The one place that decides Free or Pro. Every plan check calls this, never
 * users.plan. One query, shared by everything in the same request.
 */
export const getEffectivePlan = cache(async (userId: string): Promise<BillingState> => {
  try {
    const [found] = await db
      .select({
        customerId: subscriptions.customerId,
        subscriptionId: subscriptions.subscriptionId,
        status: subscriptions.status,
        interval: subscriptions.interval,
        cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
        grantId: planGrants.id,
        grantExpiresAt: planGrants.expiresAt,
      })
      .from(users)
      .leftJoin(subscriptions, eq(subscriptions.userId, users.id))
      .leftJoin(
        planGrants,
        and(
          eq(planGrants.email, sql`lower(${users.email})`),
          isNull(planGrants.revokedAt),
          or(isNull(planGrants.expiresAt), gt(planGrants.expiresAt, sql`now()`)),
        ),
      )
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
      .limit(1);

    const row = found?.customerId || found?.status
      ? {
          customerId: found.customerId,
          subscriptionId: found.subscriptionId,
          status: found.status as SubscriptionStatus | null,
          interval: found.interval as BillingInterval | null,
          cancelAtPeriodEnd: found.cancelAtPeriodEnd ?? false,
          currentPeriodEnd: found.currentPeriodEnd,
        }
      : null;

    const effective = resolvePlan({
      enforced: billingEnforced(),
      grant: found?.grantId ? { expiresAt: found.grantExpiresAt } : null,
      subscription: row,
      now: new Date(),
    });

    return { ...effective, row };
  } catch (error) {
    logError("getEffectivePlan", error);
    throw new AppError("FETCH_FAILED", "Could not load your plan.");
  }
});
