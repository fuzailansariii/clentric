import "server-only";
import * as Sentry from "@sentry/nextjs";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { requireUser } from "./current-user";
import { AppError, logError } from "./errors";

// Per-user cap on writes, shared by every server instance (Upstash Redis).
// Well above what a person clicks; a script hits it in seconds.
const PER_MINUTE = 60;
const PER_HOUR = 1000;

export const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? Redis.fromEnv()
    : null;

// Fixed windows cost one Redis command each; blocked users are then answered
// from memory, so a flood doesn't burn the free command quota.
const limiters = redis && [
  new Ratelimit({
    redis,
    prefix: "clentric:writes:min",
    limiter: Ratelimit.fixedWindow(PER_MINUTE, "1 m"),
    timeout: 1000,
  }),
  new Ratelimit({
    redis,
    prefix: "clentric:writes:hour",
    limiter: Ratelimit.fixedWindow(PER_HOUR, "1 h"),
    timeout: 1000,
  }),
];

// Sentry hears once per key per instance every 10 minutes, not on every call.
const reported = new Map<string, number>();
const firstIn10Min = (key: string) => {
  if (Date.now() - (reported.get(key) ?? 0) < 600_000) return false;
  reported.set(key, Date.now());
  return true;
};

async function isOverLimit(userId: string): Promise<boolean> {
  if (!limiters) return false;
  try {
    const results = await Promise.all(limiters.map((l) => l.limit(userId)));
    const blocked = results.some((r) => !r.success);
    if (blocked && firstIn10Min(userId)) {
      Sentry.captureMessage("Write rate limit hit", {
        level: "warning",
        tags: { context: "write-limit" },
        user: { id: userId },
      });
    }
    return blocked;
  } catch (error) {
    // Upstash down or archived: let the write through rather than break the app.
    if (firstIn10Min("upstash-error")) logError("write-limit", error);
    return false;
  }
}

/** requireUser() for actions that change data: also refuses a user writing too fast. */
export async function requireWriter() {
  const user = await requireUser();
  if (await isOverLimit(user.id)) {
    throw new AppError(
      "RATE_LIMITED",
      "Too many changes in a short time. Wait a minute and try again.",
    );
  }
  return user;
}
