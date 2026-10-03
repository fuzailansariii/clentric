import { describe, expect, it } from "vitest";
import {
  EMAIL_LIMITS,
  emailLimitMessage,
  evaluateEmailQuota,
  formatWait,
  type EmailUsage,
} from "./quota-rules";

const now = Date.parse("2026-10-03T12:00:00Z");
const minutesAgo = (m: number) => new Date(now - m * 60_000);

const none: EmailUsage = {
  documentCount: 0,
  documentOldest: null,
  documentLatest: null,
  userCount: 0,
  userOldest: null,
};

describe("evaluateEmailQuota", () => {
  it("allows the first email", () => {
    expect(evaluateEmailQuota(none, now)).toEqual({
      allowed: true,
      remaining: EMAIL_LIMITS.perDocumentPerDay,
    });
  });

  it("blocks a second email within 10 minutes", () => {
    const quota = evaluateEmailQuota(
      {
        ...none,
        documentCount: 1,
        documentOldest: minutesAgo(4),
        documentLatest: minutesAgo(4),
        userCount: 1,
        userOldest: minutesAgo(4),
      },
      now,
    );
    expect(quota).toMatchObject({
      allowed: false,
      reason: "gap",
      remaining: 2,
    });
    if (!quota.allowed) {
      expect(quota.nextAt).toEqual(minutesAgo(-6));
      expect(emailLimitMessage(quota, "invoice", now)).toBe(
        "An email for this invoice just went out. You can send another in 6 min.",
      );
    }
  });

  it("allows another email once the gap has passed", () => {
    expect(
      evaluateEmailQuota(
        {
          ...none,
          documentCount: 2,
          documentOldest: minutesAgo(120),
          documentLatest: minutesAgo(11),
          userCount: 2,
          userOldest: minutesAgo(120),
        },
        now,
      ),
    ).toEqual({ allowed: true, remaining: 1 });
  });

  it("blocks a fourth email until the oldest is 24 hours old", () => {
    const quota = evaluateEmailQuota(
      {
        ...none,
        documentCount: 3,
        documentOldest: minutesAgo(60),
        documentLatest: minutesAgo(30),
        userCount: 3,
        userOldest: minutesAgo(60),
      },
      now,
    );
    expect(quota).toMatchObject({ allowed: false, reason: "document" });
    if (!quota.allowed) expect(formatWait(quota.nextAt, now)).toBe("23h");
  });

  it("blocks every document once the user hits the daily cap", () => {
    const quota = evaluateEmailQuota(
      {
        ...none,
        userCount: EMAIL_LIMITS.perUserPerDay,
        userOldest: minutesAgo(90),
      },
      now,
    );
    expect(quota).toMatchObject({
      allowed: false,
      reason: "user",
      remaining: 3,
    });
    if (!quota.allowed) {
      expect(emailLimitMessage(quota, "proposal", now)).toBe(
        "You've sent 20 emails in the last 24 hours. You can send more in 22h 30m.",
      );
    }
  });
});
