/**
 * The daily email limits as pure functions, shared by the server check
 * (lib/email/quota.ts) and the button state on the detail pages.
 */

export const EMAIL_LIMITS = {
  perDocumentPerDay: 3,
  minGapMs: 10 * 60 * 1000,
  perUserPerDay: 20,
} as const;

export const EMAIL_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Non-failed sends in the last 24 hours. */
export type EmailUsage = {
  documentCount: number;
  documentOldest: Date | null;
  documentLatest: Date | null;
  userCount: number;
  userOldest: Date | null;
};

export type EmailQuota =
  | { allowed: true; remaining: number }
  | {
      allowed: false;
      remaining: number;
      reason: "gap" | "document" | "user";
      nextAt: Date;
    };

export function evaluateEmailQuota(
  usage: EmailUsage,
  now: number = Date.now(),
): EmailQuota {
  const remaining = Math.max(
    0,
    EMAIL_LIMITS.perDocumentPerDay - usage.documentCount,
  );

  if (usage.userCount >= EMAIL_LIMITS.perUserPerDay && usage.userOldest) {
    return {
      allowed: false,
      remaining,
      reason: "user",
      nextAt: new Date(usage.userOldest.getTime() + EMAIL_WINDOW_MS),
    };
  }
  if (remaining === 0 && usage.documentOldest) {
    return {
      allowed: false,
      remaining,
      reason: "document",
      nextAt: new Date(usage.documentOldest.getTime() + EMAIL_WINDOW_MS),
    };
  }
  if (
    usage.documentLatest &&
    now - usage.documentLatest.getTime() < EMAIL_LIMITS.minGapMs
  ) {
    return {
      allowed: false,
      remaining,
      reason: "gap",
      nextAt: new Date(usage.documentLatest.getTime() + EMAIL_LIMITS.minGapMs),
    };
  }
  return { allowed: true, remaining };
}

/** "2h 15m", "7 min", "1 min". */
export function formatWait(nextAt: Date, now: number = Date.now()): string {
  const minutes = Math.max(1, Math.ceil((nextAt.getTime() - now) / 60_000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

/** Why the next email can't go yet, for a toast or a tooltip. */
export function emailLimitMessage(
  quota: Extract<EmailQuota, { allowed: false }>,
  noun: "invoice" | "proposal",
  now: number = Date.now(),
): string {
  const wait = formatWait(quota.nextAt, now);
  switch (quota.reason) {
    case "user":
      return `You've sent ${EMAIL_LIMITS.perUserPerDay} emails in the last 24 hours. You can send more in ${wait}.`;
    case "document":
      return `This ${noun} has had ${EMAIL_LIMITS.perDocumentPerDay} emails in the last 24 hours. The next one can go in ${wait}.`;
    case "gap":
      return `An email for this ${noun} just went out. You can send another in ${wait}.`;
  }
}
