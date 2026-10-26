import { existsSync } from "node:fs";
import { expect, test } from "@playwright/test";
import "./support/env";
import { AUTH_FILE } from "./support/env";

test.skip(
  !existsSync(AUTH_FILE),
  "Needs SUPABASE_SERVICE_ROLE_KEY in .env to sign the test account in.",
);
test.use({ storageState: AUTH_FILE });

const run = Date.now().toString(36);

test("leaving a form with unsaved changes asks first, from any link", async ({
  page,
}) => {
  await page.goto("/clients/new");
  await page.getByLabel("Name").fill(`E2E Unsaved ${run}`);

  const discard = page.getByRole("alertdialog");
  await page.getByRole("link", { name: "Go back" }).click();
  await expect(discard).toContainText("Discard your changes?");
  await discard.getByRole("button", { name: "Cancel" }).click();
  await expect(page).toHaveURL(/\/clients\/new$/);

  // The sidebar's Invoices link (desktop viewport).
  await page.locator('a[href="/invoices"]').first().click();
  await expect(discard).toBeVisible();
  await discard.getByRole("button", { name: "Discard changes" }).click();
  await expect(page).toHaveURL(/\/invoices$/);
});

test("a proposal can be written for someone not saved yet", async ({ page }) => {
  const title = `E2E New Client Proposal ${run}`;
  const name = `E2E Walk-in ${run}`;

  await page.goto("/proposals/new");
  await page.getByLabel("Title").fill(title);
  await page.getByRole("button", { name: "Someone new" }).click();
  await page.getByLabel("Client name").fill(name);
  await page.getByLabel("Client email").fill(`walkin-${run}@example.com`);
  await page.getByLabel("Line 1 description").fill("Design work");
  await page.getByLabel("Line 1 rate").fill("500");

  await page.getByRole("button", { name: "Send proposal" }).first().click();
  const confirm = page.getByRole("alertdialog");
  await expect(confirm).toContainText(`walkin-${run}@example.com`);
  await confirm.getByRole("button", { name: "Send proposal" }).click();

  await expect(page).toHaveURL(/\/proposals\/[0-9a-f-]{36}$/);
  await expect(page.getByText(name).first()).toBeVisible();

  // The client link shows the site it really lives on, the one emails use.
  const host = new URL(process.env.APP_URL ?? "https://clentric.app").host;
  await expect(page.getByText(`${host}/p/`).first()).toBeVisible();

  // Duplicate from the detail page opens the new draft copy.
  const sentUrl = page.url();
  await page.getByRole("button", { name: "Duplicate proposal" }).click();
  await expect(page).not.toHaveURL(sentUrl);
  await expect(page).toHaveURL(/\/proposals\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("button", { name: "Send proposal" }).first()).toBeVisible();
});

test("after a save, the leave guard stays off while the next page loads", async ({
  page,
}) => {
  await page.goto("/clients/new");
  await page.getByLabel("Name").fill(`E2E Saved ${run}`);
  await expect(page.getByRole("status").getByText("Unsaved changes")).toBeVisible();

  // Records "Unsaved changes" coming back after it went away for the save.
  await page.evaluate(() => {
    const w = window as unknown as { cameBack: boolean };
    w.cameBack = false;
    let cleared = false;
    const showing = () =>
      [...document.querySelectorAll('[role="status"]')].some((el) =>
        el.textContent?.includes("Unsaved changes"),
      );
    new MutationObserver(() => {
      if (!showing()) cleared = true;
      else if (cleared) w.cameBack = true;
    }).observe(document.body, { subtree: true, childList: true, characterData: true });
  });

  await page.getByRole("button", { name: "Save client" }).click();
  await expect(page).toHaveURL(/\/clients\/[0-9a-f-]{36}$/);
  expect(
    await page.evaluate(() => (window as unknown as { cameBack: boolean }).cameBack),
  ).toBe(false);
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
});
