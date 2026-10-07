"use server";

import { and, eq, isNull, lt, or, sql } from "drizzle-orm";
import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { billing, billingEnforced, billingEnv, getEffectivePlan } from "@/lib/billing";
import { requireUser } from "@/lib/current-user";
import { logError } from "@/lib/errors";
import { db } from "@/src/db";
import { subscriptions } from "@/src/db/schema/subscriptions";
import { users } from "@/src/db/schema/users";

/** Seconds between two checkout starts for one user (double clicks, two tabs). */
const CHECKOUT_COOLDOWN_SECONDS = 30;

const checkoutSchema = z.object({ interval: z.enum(["monthly", "yearly"]) });

const billingPageUrl = () => `${billingEnv().APP_URL}/settings/billing`;

/** Returns the hosted checkout URL; only the webhook ever grants Pro. */
export async function startCheckoutAction(
  input: unknown,
): Promise<ActionResult<{ url: string }>> {
  try {
    const parsed = checkoutSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: "Pick monthly or yearly." };

    const user = await requireUser();

    if (!billingEnforced()) {
      return { success: false, error: "Everything is free during the beta, so there's nothing to buy yet." };
    }

    const state = await getEffectivePlan(user.id);
    if (state.source === "grant") {
      return { success: false, error: "You already have Pro as a gift." };
    }
    if (state.source === "subscription") {
      return { success: false, error: "You're already on Pro." };
    }
    if (state.row?.status === "on_hold" || state.row?.status === "past_due") {
      return {
        success: false,
        error: "Your last payment didn't go through. Use Manage billing to update your card.",
      };
    }

    // Creates the row on first use and claims the cooldown in the same write.
    const [claimed] = await db
      .insert(subscriptions)
      .values({ userId: user.id, checkoutStartedAt: new Date() })
      .onConflictDoUpdate({
        target: subscriptions.userId,
        set: { checkoutStartedAt: sql`now()` },
        setWhere: and(
          eq(subscriptions.userId, user.id),
          or(
            isNull(subscriptions.checkoutStartedAt),
            lt(
              subscriptions.checkoutStartedAt,
              sql`now() - make_interval(secs => ${CHECKOUT_COOLDOWN_SECONDS})`,
            ),
          ),
        ),
      })
      .returning({ customerId: subscriptions.customerId });

    if (!claimed) {
      return { success: false, error: "A checkout was just started. Try again in a moment." };
    }

    let customerId = claimed.customerId;
    if (!customerId) {
      const [profile] = await db
        .select({ name: users.name, email: users.email })
        .from(users)
        .where(and(eq(users.id, user.id), isNull(users.deletedAt)))
        .limit(1);
      if (!profile) return { success: false, error: "Could not find your account." };

      const created = await billing.createCustomer({
        email: profile.email,
        name: profile.name || profile.email,
        userId: user.id,
      });
      const [saved] = await db
        .update(subscriptions)
        .set({ customerId: created.customerId })
        .where(and(eq(subscriptions.userId, user.id), isNull(subscriptions.customerId)))
        .returning({ customerId: subscriptions.customerId });
      customerId = saved?.customerId ?? null;
      if (!customerId) {
        // Another request saved a customer first: use that one.
        const [existing] = await db
          .select({ customerId: subscriptions.customerId })
          .from(subscriptions)
          .where(eq(subscriptions.userId, user.id))
          .limit(1);
        customerId = existing?.customerId ?? null;
      }
      if (!customerId) throw new Error("Customer id missing after create.");
    }

    const { url } = await billing.createCheckout({
      customerId,
      userId: user.id,
      interval: parsed.data.interval,
      returnUrl: `${billingPageUrl()}?checkout=success`,
    });
    if (!url.startsWith("https://")) throw new Error("Checkout URL is not https.");

    return { success: true, data: { url } };
  } catch (error) {
    logError("startCheckoutAction", error);
    return { success: false, error: "Could not start checkout. Try again." };
  }
}

/** Link to the payment provider's portal: card, invoices, cancel. */
export async function manageBillingAction(): Promise<ActionResult<{ url: string }>> {
  try {
    const user = await requireUser();
    const state = await getEffectivePlan(user.id);
    const customerId = state.row?.customerId;
    if (!customerId) {
      return { success: false, error: "There's no billing account yet." };
    }

    const { url } = await billing.createPortalLink({
      customerId,
      returnUrl: billingPageUrl(),
    });
    return { success: true, data: { url } };
  } catch (error) {
    logError("manageBillingAction", error);
    return { success: false, error: "Could not open billing. Try again." };
  }
}
