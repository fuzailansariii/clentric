"use server";

import { headers } from "next/headers";
import { db } from "@/src/db";
import { waitlistEmails } from "@/src/db/schema/waitlist";
import { and, eq, isNull } from "drizzle-orm";
import { logError } from "@/lib/errors";
import { isRateLimited } from "@/lib/rate-limit";
import type { ActionResult } from "@/lib/action-result";
import { z } from "zod";

// Public marketing actions — no requireUser() here on purpose. The waitlist
// form (and its unsubscribe counterpart) are the one place in this app
// meant to work for a signed-out visitor; gating them behind auth would
// make them unusable for the people they're for.

const emailSchema = z.object({
  email: z.email("Please enter a valid email address.").trim().toLowerCase(),
});

async function clientIp(): Promise<string> {
  const h = await headers();
  // The first hop in x-forwarded-for is the original client; behind a
  // single trusted proxy (Vercel, most hosts) that's reliable enough for a
  // soft rate limit — this isn't standing in for real abuse prevention.
  const forwarded = h.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/** Agency waitlist from the pricing card. Upserts on email: a new visitor
 * gets a row, an existing signup keeps its source and is flagged as
 * interested. Rejoining here also clears a past unsubscribe, since they've
 * just asked to hear from us again. */
export async function joinAgencyWaitlist(input: {
  email: string;
  /** Honeypot: a hidden field only bots fill. */
  website?: string;
}): Promise<ActionResult> {
  // Same answer as a real signup, so a bot learns nothing.
  if (input.website) {
    return { success: true };
  }

  const ip = await clientIp();
  if (isRateLimited(`waitlist:${ip}`, { max: 5, windowMs: 10 * 60 * 1000 })) {
    return {
      success: false,
      error: "Too many attempts. Please try again in a few minutes.",
    };
  }

  const parsed = emailSchema.safeParse({ email: input.email });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  try {
    await db
      .insert(waitlistEmails)
      .values({ email: parsed.data.email, interestedInAgency: true })
      .onConflictDoUpdate({
        target: waitlistEmails.email,
        set: { interestedInAgency: true, unsubscribedAt: null },
      });
    return { success: true };
  } catch (error) {
    logError("joinAgencyWaitlist", error);
    return {
      success: false,
      error: "Something went wrong. Please try again.",
    };
  }
}

/** Sets unsubscribedAt for this email if a row exists and isn't already
 * unsubscribed. Always returns success — an unsubscribe page that reveals
 * whether a given address is on the list is an email-enumeration leak. */
export async function unsubscribeFromWaitlist(input: {
  email: string;
}): Promise<ActionResult> {
  const parsed = emailSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  try {
    await db
      .update(waitlistEmails)
      .set({ unsubscribedAt: new Date() })
      .where(
        and(
          eq(waitlistEmails.email, parsed.data.email),
          isNull(waitlistEmails.unsubscribedAt),
        ),
      );
    return { success: true };
  } catch (error) {
    logError("unsubscribeFromWaitlist", error);
    return {
      success: false,
      error: "Something went wrong. Please try again.",
    };
  }
}
