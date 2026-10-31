import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { logError } from "./errors";
import { isRateLimited } from "./rate-limit";
import { redis } from "./write-limit";

// Limits for signed-out forms, shared by every server instance (Upstash Redis).
// Without Upstash, or when it fails, the per-instance memory limiter steps in.
const limiters = new Map<string, Ratelimit>();

function limiterFor(name: string, max: number, windowMs: number) {
  if (!redis) return null;
  let limiter = limiters.get(name);
  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      prefix: `clentric:public:${name}`,
      limiter: Ratelimit.fixedWindow(max, `${windowMs} ms`),
      timeout: 1000,
    });
    limiters.set(name, limiter);
  }
  return limiter;
}

let lastErrorAt = 0;

/** True once `id` (an IP, or "all" for a site-wide cap) used up `max` calls. */
export async function isPublicRateLimited(
  name: string,
  id: string,
  { max, windowMs }: { max: number; windowMs: number },
): Promise<boolean> {
  const limiter = limiterFor(name, max, windowMs);
  if (limiter) {
    try {
      const { success } = await limiter.limit(id);
      return !success;
    } catch (error) {
      if (Date.now() - lastErrorAt > 600_000) {
        lastErrorAt = Date.now();
        logError("public-limit", error);
      }
    }
  }
  return isRateLimited(`${name}:${id}`, { max, windowMs });
}
