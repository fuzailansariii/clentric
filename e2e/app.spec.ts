import { existsSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { AUTH_FILE, testDb } from "./support/env";

test.skip(
  !existsSync(AUTH_FILE),
  "Needs SUPABASE_SERVICE_ROLE_KEY in .env to sign the test account in.",
);
test.use({ storageState: AUTH_FILE });

// Unique per run, so a leftover row can never satisfy an assertion.
const run = Date.now().toString(36);
const clientName = `E2E Client ${run}`;
const proposalTitle = `E2E Proposal ${run}`;
const invoiceItem = `E2E Work ${run}`;

const idFrom = (page: Page, segment: string) =>
  new URL(page.url()).pathname.split(`/${segment}/`)[1];

async function proposalToken(proposalId: string) {
  const sql = testDb();
  try {
    const [row] = await sql<{ token: string }[]>`
      select token from proposals where id = ${proposalId}
    `;
    return row.token;
  } finally {
    await sql.end();
  }
}

test.describe.serial("freelancer workflow", () => {
  let clientId = "";
  let proposalId = "";

  test("dashboard loads every section", async ({ page }) => {
    await page.goto("/dashboard");
    for (const heading of [
      "Needs your attention",
      "Revenue",
      "Open proposals",
      "Active projects",
      "Recent activity",
    ]) {
      await expect(
        page.getByRole("heading", { name: heading, exact: true }),
      ).toBeVisible();
    }
    await expect(page.getByText("Paid this month")).toBeVisible();
  });

  test("create a client", async ({ page }) => {
    await page.goto("/clients/new");
    await page.getByLabel("Name").fill(clientName);
    await page.getByLabel("Email").fill(`client-${run}@example.com`);
    await page.getByRole("button", { name: "Create client" }).click();

    await expect(page).toHaveURL(/\/clients\/[0-9a-f-]{36}$/);
    clientId = idFrom(page, "clients");
    await expect(page.getByText(clientName).first()).toBeVisible();
  });

  test("create and send a proposal", async ({ page }) => {
    await page.goto(`/proposals/new?clientId=${clientId}`);
    await page.getByLabel("Title").fill(proposalTitle);
    await page.getByLabel("Description").first().fill("Design work");
    await page.getByLabel("Rate").first().fill("500");
    await page.getByRole("button", { name: "Create proposal" }).click();

    await expect(page).toHaveURL(/\/proposals\/[0-9a-f-]{36}$/);
    proposalId = idFrom(page, "proposals");

    await page.getByRole("button", { name: "Send proposal" }).click();
    await expect(page.getByText("Sent").first()).toBeVisible();
  });

  test("the client opens and accepts the proposal", async ({ browser }) => {
    const token = await proposalToken(proposalId);
    // The client has no account: a fresh, signed-out browser.
    const context = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    const page = await context.newPage();

    await page.goto(`/p/${token}`);
    await expect(
      page.getByRole("heading", { name: proposalTitle }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: /Accept proposal|deposit to begin/ })
      .click();
    await expect(page.getByText("Proposal accepted")).toBeVisible();

    await context.close();
  });

  test("create, send and get paid for an invoice", async ({ page }) => {
    await page.goto(`/invoices/new?clientId=${clientId}`);
    await page.getByLabel("What are you billing for?").fill(invoiceItem);
    await page.getByLabel("Amount").fill("1200");
    await page.getByRole("button", { name: "Create & Send" }).click();

    await expect(page).toHaveURL(/\/invoices\/[0-9a-f-]{36}$/);
    await page.getByRole("button", { name: "Mark as paid" }).first().click();
    await expect(page.getByText(/Paid in full/i).first()).toBeVisible();
  });

  test("the dashboard reflects all of it", async ({ page }) => {
    await page.goto("/dashboard");

    const feed = page.getByRole("region", { name: "Recent activity" });
    await expect(feed.getByText(`accepted “${proposalTitle}”`)).toBeVisible();
    await expect(feed.getByText(`viewed “${proposalTitle}”`)).toBeVisible();
    await expect(feed.getByText(/marked paid · \$1,200\.00/)).toBeVisible();
    await expect(
      feed.getByText(`added ${clientName} as a client`),
    ).toBeVisible();

    // Accepting started a project from the proposal.
    const projects = page.getByRole("region", { name: "Active projects" });
    await expect(projects.getByText(proposalTitle)).toBeVisible();

    await expect(page.getByText("$1,200").first()).toBeVisible();
  });
});
