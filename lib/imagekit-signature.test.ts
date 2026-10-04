import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { signImageKitUrl } from "./imagekit-signature";

const endpoint = "https://ik.imagekit.io/acme";
const key = "private_test_key";
const url = `${endpoint}/logos/logo_abc.png?tr=w-320,h-128,c-at_max`;

describe("signImageKitUrl", () => {
  it("signs the path after the endpoint plus ImageKit's no-expiry stamp", () => {
    const expected = createHmac("sha1", key)
      .update("logos/logo_abc.png?tr=w-320,h-128,c-at_max9999999999")
      .digest("hex");
    expect(signImageKitUrl(url, endpoint, key)).toBe(`${url}&ik-s=${expected}`);
    expect(signImageKitUrl(url, `${endpoint}/`, key)).toBe(
      signImageKitUrl(url, endpoint, key),
    );
  });

  it("gives a different signature for a different size", () => {
    const other = url.replace("w-320", "w-4000");
    const sig = (value: string) => value.split("ik-s=")[1];
    expect(sig(signImageKitUrl(other, endpoint, key))).not.toBe(
      sig(signImageKitUrl(url, endpoint, key)),
    );
  });

  it("refuses URLs from another host", () => {
    expect(() =>
      signImageKitUrl("https://evil.example/logo.png", endpoint, key),
    ).toThrow();
  });
});
