import { existsSync, readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { AUTH_FILE, E2E_EMAIL, testDb } from "./support/env";
import { makePng } from "./support/images";

test.skip(
  !existsSync(AUTH_FILE),
  "Needs SUPABASE_SERVICE_ROLE_KEY in .env to sign the test account in.",
);
test.skip(
  !process.env.IMAGEKIT_PRIVATE_KEY,
  "Needs IMAGEKIT_PRIVATE_KEY in .env to upload logos.",
);
test.use({ storageState: AUTH_FILE });

const run = Date.now().toString(36);
const quote = `Delivered ahead of schedule ${run}`;
const author = "Priya Shah, Head of Product at Lumen";

const logoInput = (page: Page) => page.locator('input[type="file"]');
const brandingForm = (page: Page) =>
  page.locator("form", { hasText: "Brand colour" });

async function withDb<T>(fn: (sql: ReturnType<typeof testDb>) => Promise<T>) {
  const sql = testDb();
  try {
    return await fn(sql);
  } finally {
    await sql.end();
  }
}

// Uploads are spaced 30s apart per user; tests skip the wait.
const clearCooldown = () =>
  withDb(
    (sql) =>
      sql`update users set logo_updated_at = null where email = ${E2E_EMAIL}`,
  );

const logoRow = () =>
  withDb(async (sql) => {
    const [row] = await sql<
      { logo_url: string | null; logo_file_id: string | null }[]
    >`select logo_url, logo_file_id from users where email = ${E2E_EMAIL}`;
    return row;
  });

async function upload(
  page: Page,
  file: { name: string; mimeType: string; buffer: Buffer },
) {
  await clearCooldown();
  await logoInput(page).setInputFiles(file);
}

test.describe.serial("branding", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/settings/business");
  });

  test("rejects a fake image and an oversized file", async ({ page }) => {
    await upload(page, {
      name: "logo.png",
      mimeType: "image/png",
      buffer: Buffer.from("<html><script>alert(1)</script></html>"),
    });
    await expect(page.getByText("Upload a PNG, JPG or WebP image.")).toBeVisible();

    await upload(page, {
      name: "big.png",
      mimeType: "image/png",
      buffer: Buffer.alloc(1024 * 1024 + 1),
    });
    await expect(page.getByText("Logo must be 1 MB or smaller.")).toBeVisible();

    await upload(page, {
      name: "tiny.png",
      mimeType: "image/png",
      buffer: makePng(40, 40),
    });
    await expect(
      page.getByText("Logo must be at least 64px on each side."),
    ).toBeVisible();

    expect((await logoRow()).logo_file_id).toBeNull();
  });

  test("uploads a near-1 MB PNG, then a JPEG and a WebP", async ({ page }) => {
    // Random pixels don't compress: about 875 KB, close to the 1 MB limit.
    const large = makePng(540, 540, true);
    expect(large.length).toBeGreaterThan(850_000);

    const files = [
      { name: "large.png", mimeType: "image/png", buffer: large },
      {
        name: "logo.jpg",
        mimeType: "image/jpeg",
        buffer: readFileSync("e2e/fixtures/logo.jpg"),
      },
      {
        name: "logo.webp",
        mimeType: "image/webp",
        buffer: readFileSync("e2e/fixtures/logo.webp"),
      },
    ];

    let previous: string | null = null;
    for (const file of files) {
      await upload(page, file);
      await expect
        .poll(async () => (await logoRow()).logo_file_id, { timeout: 30_000 })
        .not.toBe(previous);
      await expect(page.getByRole("button", { name: "Replace" })).toBeVisible();
      previous = (await logoRow()).logo_file_id;
    }
  });

  test("a second upload straight away is refused", async ({ page }) => {
    const before = (await logoRow()).logo_file_id;
    await upload(page, {
      name: "logo.png",
      mimeType: "image/png",
      buffer: makePng(360, 120),
    });
    await expect
      .poll(async () => (await logoRow()).logo_file_id, { timeout: 30_000 })
      .not.toBe(before);

    await logoInput(page).setInputFiles({
      name: "again.png",
      mimeType: "image/png",
      buffer: makePng(360, 120),
    });
    await expect(page.getByText(/You just changed your logo/)).toBeVisible();
  });

  test("colour and testimonial show on the public proposal", async ({
    page,
    browser,
  }) => {
    const form = brandingForm(page);
    await form.getByRole("radio", { name: "#0f766e" }).click();
    await form.getByLabel("Quote").fill(quote);
    await form.getByLabel("Who said it").fill(author);
    await form.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Branding saved")).toBeVisible();

    const token = `e2ebranding${run}abcdefghij`;
    await withDb(async (sql) => {
      const [user] = await sql<{ id: string }[]>`
        select id from users where email = ${E2E_EMAIL}
      `;
      const [client] = await sql<{ id: string }[]>`
        insert into clients (user_id, name, email)
        values (${user.id}, ${`Branding Client ${run}`}, 'brand@example.com')
        returning id
      `;
      await sql`
        insert into proposals (user_id, client_id, title, token, status, subtotal, total)
        values (${user.id}, ${client.id}, ${`Branding ${run}`}, ${token}, 'sent', '900', '900')
      `;
    });

    const context = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    const client = await context.newPage();
    await client.goto(`/p/${token}`);

    const logo = client.locator("header img");
    await expect(logo).toBeVisible();
    await expect
      .poll(() =>
        logo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth),
      )
      .toBeGreaterThan(0);

    await expect(client.getByText(quote)).toBeVisible();
    await expect(client.getByText(`— ${author}`)).toBeVisible();
    await expect(
      client.getByRole("button", { name: "Accept proposal" }),
    ).toHaveCSS("background-color", "rgb(15, 118, 110)");

    await context.close();
  });

  test("removing the logo clears it everywhere", async ({ page }) => {
    await page.getByRole("button", { name: "Remove" }).click();
    await expect(page.getByText("Logo removed")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Upload logo" }),
    ).toBeVisible();

    const row = await logoRow();
    expect(row.logo_url).toBeNull();
    expect(row.logo_file_id).toBeNull();
  });
});
