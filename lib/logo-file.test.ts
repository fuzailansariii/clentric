import { describe, expect, it } from "vitest";
import {
  LOGO_MAX_BYTES,
  detectLogoType,
  logoDimensionsError,
  logoSizeError,
} from "./logo-file";

const bytes = (...values: number[]) => new Uint8Array(values);
const ascii = (text: string) => [...text].map((char) => char.charCodeAt(0));

describe("detectLogoType", () => {
  it("recognises PNG, JPEG and WebP by their first bytes", () => {
    expect(
      detectLogoType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0)),
    ).toBe("png");
    expect(detectLogoType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("jpeg");
    expect(
      detectLogoType(bytes(...ascii("RIFF"), 0, 0, 0, 0, ...ascii("WEBPVP8 "))),
    ).toBe("webp");
  });

  it("rejects SVG, HTML, GIF and other RIFF files", () => {
    expect(detectLogoType(bytes(...ascii("<svg xmlns")))).toBeNull();
    expect(detectLogoType(bytes(...ascii("<!doctype html>")))).toBeNull();
    expect(detectLogoType(bytes(...ascii("GIF89a")))).toBeNull();
    expect(
      detectLogoType(bytes(...ascii("RIFF"), 0, 0, 0, 0, ...ascii("WAVE"))),
    ).toBeNull();
    expect(detectLogoType(bytes())).toBeNull();
  });
});

describe("logo limits", () => {
  it("rejects empty and oversized files", () => {
    expect(logoSizeError(0)).not.toBeNull();
    expect(logoSizeError(LOGO_MAX_BYTES)).toBeNull();
    expect(logoSizeError(LOGO_MAX_BYTES + 1)).not.toBeNull();
  });

  it("rejects tiny and huge images", () => {
    expect(logoDimensionsError(63, 200)).not.toBeNull();
    expect(logoDimensionsError(64, 64)).toBeNull();
    expect(logoDimensionsError(4000, 1000)).toBeNull();
    expect(logoDimensionsError(4001, 1000)).not.toBeNull();
  });
});
