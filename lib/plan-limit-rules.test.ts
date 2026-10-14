import { describe, expect, it } from "vitest";
import { PLANS } from "./plans";
import { firstFullLimit, limitReached, planLimitMessage } from "./plan-limit-rules";

const free = PLANS.free.limits;
const empty = { clients: 0, projects: 0, proposals: 0, invoicesPerMonth: 0 };

describe("plan limits", () => {
  it("blocks only once the limit is used up", () => {
    expect(limitReached({ ...empty, clients: 0 }, free, "clients")).toBe(false);
    expect(limitReached({ ...empty, clients: 1 }, free, "clients")).toBe(true);
    expect(limitReached({ ...empty, invoicesPerMonth: 2 }, free, "invoicesPerMonth")).toBe(false);
    expect(limitReached({ ...empty, invoicesPerMonth: 3 }, free, "invoicesPerMonth")).toBe(true);
  });

  it("never blocks an unlimited plan", () => {
    const busy = { clients: 900, projects: 900, proposals: 900, invoicesPerMonth: 900 };
    expect(firstFullLimit(busy, PLANS.pro.limits, ["clients", "invoicesPerMonth"])).toBeNull();
  });

  it("reports the first full kind it is asked about", () => {
    const usage = { ...empty, clients: 1, invoicesPerMonth: 3 };
    expect(firstFullLimit(usage, free, ["invoicesPerMonth", "clients"])).toBe("invoicesPerMonth");
    expect(firstFullLimit({ ...empty, clients: 1 }, free, ["invoicesPerMonth", "clients"])).toBe("clients");
    expect(firstFullLimit(usage, free, ["proposals"])).toBeNull();
  });

  it("explains the limit in plain words", () => {
    expect(planLimitMessage("clients", 1)).toBe(
      "The Free plan includes 1 client. Upgrade to Pro for unlimited clients.",
    );
    expect(planLimitMessage("invoicesPerMonth", 3)).toBe(
      "The Free plan includes 3 invoices a month. Upgrade to Pro for unlimited invoices, or create more next month.",
    );
  });
});
