export const DEFAULT_BRAND_COLOR = "#3454d1";

export const BRAND_COLOR_PRESETS = [
  "#3454d1",
  "#0f766e",
  "#15803d",
  "#b45309",
  "#c2410c",
  "#be123c",
  "#7c3aed",
  "#111111",
] as const;

export const BRAND_COLOR_PATTERN = /^#[0-9a-f]{6}$/;

export function resolveBrandColor(value: string | null | undefined): string {
  const color = value?.trim().toLowerCase() ?? "";
  return BRAND_COLOR_PATTERN.test(color) ? color : DEFAULT_BRAND_COLOR;
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((start) => {
    const channel = parseInt(hex.slice(start, start + 2), 16) / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const contrast = (a: number, b: number) =>
  (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

/** White or near-black, whichever reads better on the brand colour. */
export function textOnBrandColor(hex: string): "#ffffff" | "#111111" {
  const background = luminance(resolveBrandColor(hex));
  return contrast(background, 1) >= contrast(background, luminance("#111111"))
    ? "#ffffff"
    : "#111111";
}
