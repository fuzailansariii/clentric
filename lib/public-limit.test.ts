import { beforeEach, describe, expect, it, vi } from "vitest";

const limit = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("@sentry/nextjs", () => ({
  captureMessage: vi.fn(),
  captureException: vi.fn(),
}));
vi.mock("@upstash/redis", () => ({ Redis: { fromEnv: () => ({}) } }));
vi.mock("@upstash/ratelimit", () => {
  class Ratelimit {
    static fixedWindow = () => ({});
    limit = limit;
  }
  return { Ratelimit };
});
vi.mock("./current-user", () => ({ requireUser: vi.fn() }));

async function load(configured: boolean) {
  vi.resetModules();
  vi.stubEnv(
    "UPSTASH_REDIS_REST_URL",
    configured ? "https://x.upstash.io" : "",
  );
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", configured ? "token" : "");
  return import("./public-limit");
}

const opts = { max: 2, windowMs: 60_000 };

describe("isPublicRateLimited", () => {
  beforeEach(() => {
    limit.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("asks Upstash with the caller's id", async () => {
    limit.mockResolvedValue({ success: true });
    const { isPublicRateLimited } = await load(true);
    await expect(isPublicRateLimited("contact", "1.2.3.4", opts)).resolves.toBe(
      false,
    );
    expect(limit).toHaveBeenCalledWith("1.2.3.4");
  });

  it("blocks once Upstash says the window is used up", async () => {
    limit.mockResolvedValue({ success: false });
    const { isPublicRateLimited } = await load(true);
    await expect(isPublicRateLimited("contact", "1.2.3.4", opts)).resolves.toBe(
      true,
    );
  });

  it("falls back to the memory limit when Upstash fails", async () => {
    limit.mockRejectedValue(new Error("fetch failed"));
    const { isPublicRateLimited } = await load(true);
    const calls = [1, 2, 3].map(() =>
      isPublicRateLimited("contact", "5.6.7.8", opts),
    );
    expect(await Promise.all(calls)).toEqual([false, false, true]);
  });

  it("uses the memory limit when Upstash isn't configured", async () => {
    const { isPublicRateLimited } = await load(false);
    const results = [];
    for (let i = 0; i < 3; i++) {
      results.push(await isPublicRateLimited("contact", "9.9.9.9", opts));
    }
    expect(results).toEqual([false, false, true]);
    expect(limit).not.toHaveBeenCalled();
  });
});
