import { describe, expect, it } from "vitest";
import { CURRENCY_CODES } from "./currency-options";

describe("currencies", () => {
  it("bills in USD only", () => {
    expect(CURRENCY_CODES).toEqual(["USD"]);
  });
});
