import { describe, expect, it } from "vitest";
import { authErrorMessage } from "./auth-error-message";

describe("authErrorMessage", () => {
  it("explains rate limits", () => {
    expect(
      authErrorMessage({
        message: "email rate limit exceeded",
        code: "over_email_send_rate_limit",
      }),
    ).toMatch(/Too many codes/);
    expect(
      authErrorMessage({
        message:
          "For security purposes, you can only request this after 42 seconds.",
      }),
    ).toMatch(/wait a moment/);
  });

  it("explains a bad or expired code", () => {
    expect(
      authErrorMessage({ message: "Token has expired or is invalid" }),
    ).toMatch(/wrong or has expired/);
  });

  it("points to sign-up when there's no account", () => {
    expect(
      authErrorMessage({ message: "Signups not allowed for otp" }),
    ).toMatch(/No account found/);
  });

  it("passes unknown errors through", () => {
    expect(authErrorMessage({ message: "Something odd" })).toBe(
      "Something odd",
    );
  });
});
