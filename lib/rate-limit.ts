// In-memory sliding-window limiter — a soft, best-effort speed bump against
// casual form spam, not a durable one. Each server instance keeps its own
// map (a cold start, or a second instance behind a load balancer, gets a
// clean slate), so this doesn't replace a real shared store. Upstash Redis
// (or similar) would give an actually-distributed limit, but that's a new
// dependency — ask before adding it rather than reaching for it here.
const hits = new Map<string, number[]>();

// Keeps the map from growing without bound under sustained traffic between
// legitimate cleanups (every check only prunes its own key).
const MAX_TRACKED_KEYS = 5000;

export function isRateLimited(
  key: string,
  { max, windowMs }: { max: number; windowMs: number },
): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);

  if (recent.length >= max) {
    hits.set(key, recent);
    return true;
  }

  recent.push(now);
  hits.set(key, recent);

  if (hits.size > MAX_TRACKED_KEYS) {
    for (const [k, timestamps] of hits) {
      if (timestamps.every((t) => now - t >= windowMs)) hits.delete(k);
    }
  }

  return false;
}
