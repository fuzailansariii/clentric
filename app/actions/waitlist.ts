"use server";

import { headers } from "next/headers";
import { db } from "@/src/db";
import { waitlistEmails } from "@/src/db/schema/waitlist";
import { and, count, eq, isNull } from "drizzle-orm";
import { isUniqueViolation, logError } from "@/lib/errors";
import { isRateLimited } from "@/lib/rate-limit";
import type { ActionResult } from "@/lib/action-result";
import { z } from "zod";

// Public marketing actions — no requireUser() here on purpose. The waitlist
// form (and its unsubscribe counterpart) are the one place in this app
// meant to work for a signed-out visitor; gating them behind auth would
// make them unusable for the people they're for.

const sourceEnum = z.enum(["x", "reddit", "direct", "other"]);

const waitlistSchema = z.object({
  email: z.email("Please enter a valid email address.").trim().toLowerCase(),
  source: sourceEnum.default("direct"),
});

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

export async function joinWaitlist(input: {
  email: string;
  source?: string;
  /** Honeypot — a hidden field real visitors never see or fill. A filled
   * value means something crawled and submitted every field it could find. */
  website?: string;
}): Promise<ActionResult> {
  // Report success to a bot exactly like a real signup — telling it "no"
  // only teaches it to retry with a different shape.
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

  // An unrecognized source (e.g. a stray ?ref= value) falls back to
  // "direct" instead of failing the whole submission over a marketing tag.
  const source = sourceEnum.safeParse(input.source).data ?? "direct";
  const parsed = waitlistSchema.safeParse({ email: input.email, source });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  try {
    await db.insert(waitlistEmails).values(parsed.data);
    return { success: true };
  } catch (error) {
    if (!isUniqueViolation(error)) {
      logError("joinWaitlist", error);
      return {
        success: false,
        error: "Something went wrong. Please try again.",
      };
    }

    // A row for this email already exists. If they'd previously
    // unsubscribed, signing up again should welcome them back rather than
    // report a confusing "already on the list" for someone who isn't.
    const [existing] = await db
      .select({ unsubscribedAt: waitlistEmails.unsubscribedAt })
      .from(waitlistEmails)
      .where(eq(waitlistEmails.email, parsed.data.email))
      .limit(1);

    if (existing?.unsubscribedAt) {
      await db
        .update(waitlistEmails)
        .set({ unsubscribedAt: null, source: parsed.data.source })
        .where(eq(waitlistEmails.email, parsed.data.email));
      return { success: true };
    }

    return { success: false, error: "You're already on the waitlist!" };
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

/** Real, currently-subscribed signup count for the landing page's
 * social-proof line — never a made-up number, and never counts someone who
 * unsubscribed. Returns null when the read fails: the page must still render,
 * but a failed read must not show up as "0 people" (that's what had the page
 * saying "Be one of the first" while signups existed). */
export async function getWaitlistCount(): Promise<number | null> {
  try {
    const [row] = await db
      .select({ value: count() })
      .from(waitlistEmails)
      .where(isNull(waitlistEmails.unsubscribedAt));
    return row?.value ?? 0;
  } catch (error) {
    logError("getWaitlistCount", error);
    return null;
  }
}
