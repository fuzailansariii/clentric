import { describe, expect, it } from "vitest";
import {
  BRAND_COLOR_PRESETS,
  DEFAULT_BRAND_COLOR,
  resolveBrandColor,
  textOnBrandColor,
} from "./brand-color";

describe("resolveBrandColor", () => {
  it("keeps a valid hex and lowercases it", () => {
    expect(resolveBrandColor("#0F766E")).toBe("#0f766e");
  });

  it("falls back to the default for anything else", () => {
    expect(resolveBrandColor(null)).toBe(DEFAULT_BRAND_COLOR);
    expect(resolveBrandColor("red")).toBe(DEFAULT_BRAND_COLOR);
    expect(resolveBrandColor("#fff")).toBe(DEFAULT_BRAND_COLOR);
    expect(resolveBrandColor("#123456;background:url(x)")).toBe(
      DEFAULT_BRAND_COLOR,
    );
  });
});

describe("textOnBrandColor", () => {
  it("uses white on dark colours and dark text on light ones", () => {
    expect(textOnBrandColor("#111111")).toBe("#ffffff");
    expect(textOnBrandColor("#ffffff")).toBe("#111111");
    expect(textOnBrandColor("#facc15")).toBe("#111111");
  });

  it("puts white text on every preset", () => {
    for (const color of BRAND_COLOR_PRESETS) {
      expect(textOnBrandColor(color)).toBe("#ffffff");
    }
  });
});
