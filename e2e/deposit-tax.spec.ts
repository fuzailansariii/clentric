import { existsSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { AUTH_FILE, testDb } from "./support/env";

test.skip(
  !existsSync(AUTH_FILE),
  "Needs SUPABASE_SERVICE_ROLE_KEY in .env to sign the test account in.",
);
test.use({ storageState: AUTH_FILE });

const run = Date.now().toString(36);
const clientName = `E2E Tax Client ${run}`;
const proposalTitle = `E2E Taxed Proposal ${run}`;

const idFrom = (page: Page, segment: string) =>
  new URL(page.url()).pathname.split(`/${segment}/`)[1];

// Stages of $400 and $600, 10% tax, 50% deposit: budget, milestones and deposit
// all sit before tax, and the deposit shows its tax on its own line.
test("a taxed proposal's deposit and project agree before tax", async ({
  page,
  browser,
}) => {
  await page.goto("/clients/new");
  await page.getByLabel("Name").fill(clientName);
  await page.getByLabel("Email").fill(`tax-${run}@example.com`);
  await page.getByRole("button", { name: "Save client" }).click();
  await expect(page).toHaveURL(/\/clients\/[0-9a-f-]{36}$/);
  const clientId = idFrom(page, "clients");

  await page.goto(`/proposals/new?clientId=${clientId}`);
  await page.getByLabel("Title").fill(proposalTitle);
  await page.getByLabel("Stage 1 name").fill("Design");
  await page.getByLabel("Line 1 description").fill("Design work");
  await page.getByLabel("Line 1 rate").fill("400");
  await page.getByRole("button", { name: "Add stage" }).click();
  await page.getByLabel("Stage 2 name").fill("Build");
  await page.getByLabel("Line 1 description").nth(1).fill("Build work");
  await page.getByLabel("Line 1 rate").nth(1).fill("600");
  await page.getByLabel("Tax rate").fill("10");
  await page.getByLabel("Custom deposit").fill("50");
  await page.getByRole("button", { name: "Save draft" }).first().click();
  await expect(page).toHaveURL(/\/proposals\/[0-9a-f-]{36}$/);
  const proposalId = idFrom(page, "proposals");
  await page.getByRole("button", { name: "Send proposal" }).first().click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Send proposal" }).click();
  await expect(
    page.getByRole("button", { name: "Copy client link" }).first(),
  ).toBeVisible();

  const sql = testDb();
  try {
    const [{ token }] = await sql<{ token: string }[]>`
      select token from proposals where id = ${proposalId}
    `;

    const client = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    const clientPage = await client.newPage();
    await clientPage.goto(`/p/${token}`);
    await clientPage
      .getByRole("button", { name: /Accept proposal|deposit to begin/ })
      .click();
    await expect(clientPage.getByText("You accepted this proposal")).toBeVisible();
    await expect(clientPage.getByText("$550.00").first()).toBeVisible();
    await client.close();

    const [row] = await sql<
      {
        projectId: string;
        budget: string;
        subTotal: string;
        taxRate: string;
        taxAmount: string;
        total: string;
        line: string;
        milestones: string;
      }[]
    >`
      select p.id as "projectId", p.budget, i.sub_total as "subTotal",
             i.tax_rate as "taxRate", i.tax_amount as "taxAmount", i.total,
             (select description from invoice_items where invoice_id = i.id) as line,
             (select sum(amount)::text from milestones where project_id = p.id) as milestones
      from proposals pr
      join invoices i on i.id = pr.deposit_invoice_id
      join projects p on p.proposal_id = pr.id
      where pr.id = ${proposalId}
    `;
    // The client pays 50% of $1,100 as before: $500 + $50 tax.
    expect(row).toMatchObject({
      budget: "1000.00",
      milestones: "1000.00",
      subTotal: "500.00",
      taxRate: "10.00",
      taxAmount: "50.00",
      total: "550.00",
      line: "Deposit (50%)",
    });

    // The strip counts the deposit before tax; the note says why it isn't $550.
    await page.goto(`/projects/${row.projectId}`);
    await expect(
      page.getByText("Amounts above are before tax", { exact: false }),
    ).toBeVisible();

    // A new invoice on this project starts at the proposal's 10% tax.
    await page.goto(`/invoices/new?clientId=${clientId}&projectId=${row.projectId}`);
    await expect(page.getByLabel("Tax rate")).toHaveValue("10");
  } finally {
    await sql.end();
  }
});
