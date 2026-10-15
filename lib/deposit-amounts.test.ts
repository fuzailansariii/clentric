import { describe, expect, it } from "vitest";
import { depositAmounts } from "./deposit-amounts";

describe("depositAmounts", () => {
  it("puts the line on the subtotal and the tax on its own", () => {
    expect(depositAmounts("1000.00", "1100.00", "50.00")).toEqual({
      subTotal: 500,
      taxAmount: 50,
      total: 550,
    });
  });

  it("has no tax line when the proposal has no tax", () => {
    expect(depositAmounts(1000, 1000, 30)).toEqual({ subTotal: 300, taxAmount: 0, total: 300 });
  });

  it("keeps the total the client pays at percent x proposal total, to the cent", () => {
    // 33% of $358.34 is $118.2522; taxing a rounded $110.00 at 7.5% would give $118.25.
    const subtotal = 333.34;
    const total = 358.34;
    const d = depositAmounts(subtotal, total, 33);
    expect(d.total).toBe(Math.round(total * 0.33 * 100) / 100);
    expect(Math.round((d.subTotal + d.taxAmount) * 100) / 100).toBe(d.total);
  });
});
