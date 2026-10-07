"use server";

import { headers } from "next/headers";
import { z } from "zod";

import { logError } from "@/lib/errors";
import { isRateLimited } from "@/lib/rate-limit";
import { LEGAL } from "@/lib/legal-config";
import type { ActionResult } from "@/lib/action-result";
import { emailConfig } from "@/lib/email/config";
import { sendEmail } from "@/lib/email/send-email";

// Public support action — no requireUser() here on purpose, the same way the
// waitlist actions work. Someone who cannot sign in (or has no account at
// all) still has to be able to reach support; payment providers also expect the
// contact route to be reachable without an account.

const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Please enter your name.")
    .max(100, "Please keep your name under 100 characters.")
    .refine((value) => !/[\r\n]/.test(value), "Please enter a single line."),
  email: z
    .email("Please enter a valid email address.")
    .trim()
    .toLowerCase()
    .max(254, "Please enter a shorter email address."),
  message: z
    .string()
    .trim()
    .min(10, "Please give us a little more detail (at least 10 characters).")
    .max(5000, "Please keep your message under 5,000 characters."),
});

type ContactMessage = z.infer<typeof contactSchema>;

async function clientIp(): Promise<string> {
  // `headers()` is async in Next 15+ and synchronous access was removed in
  // Next 16, so it always has to be awaited.
  const h = await headers();
  // The first hop in x-forwarded-for is the original client; behind a single
  // trusted proxy that is good enough for a soft rate limit.
  const forwarded = h.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/** Sends the support email. Plain text only, built from validated fields. */
async function deliverContactMessage(
  message: ContactMessage,
): Promise<boolean> {
  const result = await sendEmail({
    to: emailConfig().supportEmail,
    fromName: `${LEGAL.productName} contact form`,
    replyTo: message.email,
    subject: `${LEGAL.productName} contact form: ${message.name}`,
    text: [
      `From: ${message.name} <${message.email}>`,
      "",
      message.message,
    ].join("\n"),
  });
  return result.status !== "failed";
}

export async function submitContactForm(
  formData: FormData,
): Promise<ActionResult> {
  try {
    // Honeypot: a field no real visitor can see or tab into. When it is
    // filled, report success exactly like a genuine send — telling a bot "no"
    // only teaches it to retry with a different shape.
    if (formData.get("website")) {
      return { success: true };
    }

    const parsed = contactSchema.safeParse({
      name: formData.get("name"),
      email: formData.get("email"),
      message: formData.get("message"),
    });

    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Please check your details.",
      };
    }

    const ip = await clientIp();
    if (isRateLimited(`contact:${ip}`, { max: 3, windowMs: 10 * 60 * 1000 })) {
      return {
        success: false,
        error: `Too many messages just now. Please try again in a few minutes, or email ${LEGAL.supportEmail} directly.`,
      };
    }

    if (!(await deliverContactMessage(parsed.data))) {
      return {
        success: false,
        error: `We could not send your message just now. Please email us at ${LEGAL.supportEmail} and we will pick it up there.`,
      };
    }

    return { success: true };
  } catch (error) {
    logError("submitContactForm", error);
    return {
      success: false,
      error: `We could not send your message just now. Please email us at ${LEGAL.supportEmail} and we will pick it up there.`,
    };
  }
}
