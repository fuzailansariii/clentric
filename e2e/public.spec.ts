import { expect, test } from "@playwright/test";
import { E2E_EMAIL } from "./support/env";

// Signed out: no saved session.
test.use({ storageState: { cookies: [], origins: [] } });

test("protected pages send signed-out visitors to login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?redirectTo=%2Fdashboard/);
  await expect(
    page.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible();
});

test("login and register pages render", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Send code" })).toBeVisible();

  await page.goto("/register");
  await expect(page.getByLabel(/name/i).first()).toBeVisible();
});

test("an unknown proposal link shows the unavailable page", async ({
  page,
}) => {
  await page.goto("/p/not-a-real-token-for-any-proposal-123");
  await expect(
    page.getByText(/no longer available|not available|unavailable/i).first(),
  ).toBeVisible();
});

// Regression: after a reload on the code step, verifying used an empty email.
test("verifying a code after a reload keeps the email", async ({ page }) => {
  await page.addInitScript((email) => {
    sessionStorage.setItem("auth_login_step", "verify");
    sessionStorage.setItem("auth_login_email", email);
  }, E2E_EMAIL);

  await page.goto("/login");
  await page.getByLabel("Digit 1 of 6").click();
  await page.keyboard.type("000000");

  await expect(page.getByText(/wrong or has expired/i)).toBeVisible();
});
