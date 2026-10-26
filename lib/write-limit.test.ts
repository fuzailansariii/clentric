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
vi.mock("./current-user", () => ({
  requireUser: async () => ({ id: "user-1" }),
}));

async function load(configured: boolean) {
  vi.resetModules();
  vi.stubEnv(
    "UPSTASH_REDIS_REST_URL",
    configured ? "https://x.upstash.io" : "",
  );
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", configured ? "token" : "");
  return import("./write-limit");
}

describe("requireWriter", () => {
  beforeEach(() => {
    limit.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("lets a user under the limit write", async () => {
    limit.mockResolvedValue({ success: true });
    const { requireWriter } = await load(true);
    await expect(requireWriter()).resolves.toEqual({ id: "user-1" });
    expect(limit).toHaveBeenCalledWith("user-1");
  });

  it("refuses once either window is used up", async () => {
    limit
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: false });
    const { requireWriter } = await load(true);
    await expect(requireWriter()).rejects.toMatchObject({
      code: "RATE_LIMITED",
    });
  });

  it("lets writes through when Upstash fails", async () => {
    limit.mockRejectedValue(new Error("fetch failed"));
    const { requireWriter } = await load(true);
    await expect(requireWriter()).resolves.toEqual({ id: "user-1" });
  });

  it("does nothing when Upstash isn't configured", async () => {
    const { requireWriter } = await load(false);
    await expect(requireWriter()).resolves.toEqual({ id: "user-1" });
    expect(limit).not.toHaveBeenCalled();
  });
});
