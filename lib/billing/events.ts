import "server-only";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/src/db";
import { subscriptions } from "@/src/db/schema/subscriptions";
import { users } from "@/src/db/schema/users";
import { webhookEvents } from "@/src/db/schema/webhook-events";
import { logError } from "@/lib/errors";
import type { BillingProvider, NormalizedEvent } from "./types";

export type ApplyOutcome =
  | "applied"
  | "duplicate"
  | "stale"
  | "unmatched"
  | "ignored"
  | "stored";

export type ApplyResult = {
  outcome: ApplyOutcome;
  /** Subscriptions the caller must cancel after replying (duplicates, deleted accounts). */
  toCancel: string[];
};

/** Statuses where the provider can still charge the card. */
const CHARGING = new Set(["pending", "active", "past_due", "on_hold", "paused"]);

/**
 * Records the event and applies it in one transaction: if anything fails the
 * event row rolls back too, so the provider's retry is processed, not skipped.
 * Throws only on a database error.
 */
export async function applyBillingEvent(
  event: NormalizedEvent,
  provider: Pick<BillingProvider, "name" | "intervalForProduct">,
): Promise<ApplyResult> {
  const s = event.subscription;
  // Ids and states only: no names, emails or addresses kept from the payload.
  const summary = {
    type: event.type,
    occurredAt: event.occurredAt.toISOString(),
    ...(s && {
      customerId: s.customerId,
      subscriptionId: s.subscriptionId,
      productId: s.productId,
      status: s.status,
      cancelAtPeriodEnd: s.cancelAtPeriodEnd,
      currentPeriodEnd: s.currentPeriodEnd?.toISOString() ?? null,
    }),
  };

  return db.transaction(async (tx) => {
    const [stored] = await tx
      .insert(webhookEvents)
      .values({
        provider: provider.name,
        eventId: event.id,
        eventType: event.type,
        payload: summary,
      })
      .onConflictDoNothing({ target: webhookEvents.eventId })
      .returning({ id: webhookEvents.id });

    if (!stored) return { outcome: "duplicate", toCancel: [] };

    const result: ApplyResult = { outcome: "stored", toCancel: [] };

    if (s) {
      const lockColumns = {
        id: subscriptions.id,
        subscriptionId: subscriptions.subscriptionId,
        status: subscriptions.status,
        lastEventAt: subscriptions.lastEventAt,
        deletionRequestedAt: users.deletionRequestedAt,
      };
      let [current] = await tx
        .select(lockColumns)
        .from(subscriptions)
        .innerJoin(users, eq(users.id, subscriptions.userId))
        .where(eq(subscriptions.customerId, s.customerId))
        .for("update", { of: subscriptions });

      // Fallback: our user id from checkout metadata, for a row without a customer yet.
      if (!current && s.metadataUserId) {
        [current] = await tx
          .select(lockColumns)
          .from(subscriptions)
          .innerJoin(users, eq(users.id, subscriptions.userId))
          .where(
            and(
              sql`${subscriptions.userId}::text = ${s.metadataUserId}`,
              isNull(subscriptions.customerId),
            ),
          )
          .for("update", { of: subscriptions });
      }

      const interval = provider.intervalForProduct(s.productId);
      const willCharge = CHARGING.has(s.status) && !s.cancelAtPeriodEnd;

      if (!current) {
        result.outcome = "unmatched";
        logError("billing.webhook", new Error(`No user for customer ${s.customerId} (${event.type})`));
      } else if (current.lastEventAt && current.lastEventAt > event.occurredAt) {
        result.outcome = "stale";
      } else if (!interval) {
        // Not one of our Pro products: keep the record, grant nothing.
        result.outcome = "ignored";
        logError("billing.webhook", new Error(`Unknown product ${s.productId} on ${s.subscriptionId}`));
      } else if (
        current.subscriptionId &&
        current.subscriptionId !== s.subscriptionId &&
        current.status &&
        CHARGING.has(current.status)
      ) {
        // A second subscription while the stored one is still live: it must
        // never overwrite the live one. Stop it renewing; refund by hand.
        result.outcome = "ignored";
        if (willCharge) {
          result.toCancel.push(s.subscriptionId);
          logError(
            "billing.webhook",
            new Error(`Duplicate subscription ${s.subscriptionId} beside ${current.subscriptionId}: cancelling, refund it by hand`),
          );
        }
      } else {
        await tx
          .update(subscriptions)
          .set({
            customerId: s.customerId,
            subscriptionId: s.subscriptionId,
            productId: s.productId,
            interval,
            status: s.status,
            cancelAtPeriodEnd: s.cancelAtPeriodEnd,
            currentPeriodEnd: s.currentPeriodEnd,
            lastEventAt: event.occurredAt,
          })
          .where(eq(subscriptions.id, current.id));
        result.outcome = "applied";
        // Paid moments before deleting the account: stop it renewing too.
        if (current.deletionRequestedAt && willCharge) {
          result.toCancel.push(s.subscriptionId);
        }
      }
    }

    await tx
      .update(webhookEvents)
      .set({ processedAt: new Date() })
      .where(eq(webhookEvents.id, stored.id));

    return result;
  });
}
