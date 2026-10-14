import { existsSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { AUTH_FILE, E2E_EMAIL, testDb } from "./support/env";

test.skip(
  !existsSync(AUTH_FILE),
  "Needs SUPABASE_SERVICE_ROLE_KEY in .env to sign the test account in.",
);
// The test account is on Free only while paid plans are switched on.
test.skip(
  process.env.BILLING_ENFORCED !== "true",
  "Run with BILLING_ENFORCED=true: npx playwright test plan-limits",
);
test.use({ storageState: AUTH_FILE });

const run = Date.now().toString(36);
const LIMIT_HEADING = "You've reached the Free plan limit";

async function count(table: "clients" | "invoices", liveOnly: boolean) {
  const sql = testDb();
  try {
    const [row] = await sql<{ n: number }[]>`
      select count(*)::int as n from ${sql(table)} t
      join users u on u.id = t.user_id
      where lower(u.email) = ${E2E_EMAIL.toLowerCase()}
        ${liveOnly ? sql`and t.deleted_at is null` : sql``}`;
    return row.n;
  } finally {
    await sql.end();
  }
}

async function draftInvoice(page: Page, clientId: string, n: number) {
  await page.goto(`/invoices/new?clientId=${clientId}`);
  await page.getByLabel("Description").fill(`Limit check ${run} #${n}`);
  await page.getByLabel("Amount").fill("100");
  await page.getByRole("button", { name: "Save as Draft" }).first().click();
  await expect(page).toHaveURL(/\/invoices\/[0-9a-f-]{36}$/);
  return new URL(page.url()).pathname.split("/invoices/")[1];
}

test.describe.serial("Free plan limits", () => {
  let clientId = "";
  let invoiceId = "";

  test("two tabs racing for the only client slot: one wins", async ({ browser }) => {
    const context = await browser.newContext({ storageState: AUTH_FILE });
    const [a, b] = [await context.newPage(), await context.newPage()];
    await Promise.all([a.goto("/clients/new"), b.goto("/clients/new")]);
    await a.getByLabel("Name").fill(`Race A ${run}`);
    await b.getByLabel("Name").fill(`Race B ${run}`);
    await Promise.all([
      a.getByRole("button", { name: "Save client" }).click(),
      b.getByRole("button", { name: "Save client" }).click(),
    ]);

    const saved = (p: Page) => /\/clients\/[0-9a-f-]{36}$/.test(p.url());
    await expect.poll(() => [a, b].filter(saved).length).toBe(1);
    const [winner, loser] = saved(a) ? [a, b] : [b, a];
    // The loser's action has finished once it shows why, so the count is final.
    await expect(loser.getByText("The Free plan includes 1 client.").first()).toBeVisible();
    expect(await count("clients", true)).toBe(1);
    clientId = new URL(winner.url()).pathname.split("/clients/")[1];
    await context.close();
  });

  test("a full plan swaps the form for the upgrade card", async ({ page }) => {
    await page.goto("/clients/new");
    await expect(page.getByRole("heading", { name: LIMIT_HEADING })).toBeVisible();
    await expect(page.getByText("The Free plan includes 1 client.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Upgrade to Pro" })).toHaveAttribute(
      "href",
      "/settings/billing",
    );
  });

  test("the invoice form hides Bill someone new", async ({ page }) => {
    await page.goto("/invoices/new");
    await expect(page.getByText("Billing someone new adds a client.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Bill someone new" })).toHaveCount(0);
  });

  test("PDF download is Pro only", async ({ page }) => {
    invoiceId = await draftInvoice(page, clientId, 1);
    const response = await page.request.get(`/api/invoices/${invoiceId}/pdf`);
    expect(response.status()).toBe(403);
    expect(await response.text()).toContain("part of Pro");
  });

  test("3 invoices a month, and deleting one doesn't free a slot", async ({ page }) => {
    await draftInvoice(page, clientId, 2);
    await draftInvoice(page, clientId, 3);
    await page.goto("/invoices/new");
    await expect(page.getByRole("heading", { name: LIMIT_HEADING })).toBeVisible();

    const sql = testDb();
    try {
      await sql`update invoices set deleted_at = now() where id = ${invoiceId}`;
    } finally {
      await sql.end();
    }
    expect(await count("invoices", true)).toBe(2);
    await page.goto("/invoices/new");
    await expect(page.getByRole("heading", { name: LIMIT_HEADING })).toBeVisible();
  });

  test("logo and brand colour are locked", async ({ page }) => {
    await page.goto("/settings/business");
    await expect(page.getByText("Part of Pro. Upgrade to show your logo")).toBeVisible();
    await expect(page.getByRole("button", { name: "Upload logo" })).toHaveCount(0);
    await expect(page.getByRole("radio").first()).toBeDisabled();
  });
});
