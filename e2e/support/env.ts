import { config } from "dotenv";
import postgres from "postgres";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

config({ path: ".env", quiet: true });

export const E2E_EMAIL = process.env.E2E_EMAIL ?? "e2e@clentric.test";
export const AUTH_FILE = "e2e/.auth/user.json";

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is missing. Add it to .env to run the end-to-end tests.`,
    );
  }
  return value;
}

/** Direct database access, for test setup and cleanup only. */
export function testDb() {
  return postgres(requireEnv("DATABASE_URL"), { prepare: false, max: 1 });
}

/** Supabase with the service role, for creating and signing in test accounts. */
export function adminClient(): SupabaseClient {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/** Creates the confirmed test account if it's missing; returns its user id. */
export async function ensureTestUser(
  admin: SupabaseClient,
  email: string,
  fullName: string,
): Promise<string> {
  const sql = testDb();
  try {
    // The beta sign-up hook refuses emails that aren't invited.
    await sql`insert into beta_invites (email, note) values (${email.toLowerCase()}, 'test') on conflict (email) do nothing`;

    const created = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (created.error && created.error.code !== "email_exists") {
      throw created.error;
    }
    if (created.data.user) return created.data.user.id;

    const [row] = await sql<{ id: string }[]>`
      select id from users where lower(email) = ${email.toLowerCase()}
    `;
    if (!row) throw new Error(`No users row for ${email}.`);
    return row.id;
  } finally {
    await sql.end();
  }
}

/** Removes everything the test account owns, leaving the account itself. */
export async function deleteTestData(userId: string) {
  const sql = testDb();
  try {
    await sql.begin(async (tx) => {
      await tx`update proposals set deposit_invoice_id = null where user_id = ${userId}`;
      await tx`delete from invoice_items where invoice_id in (select id from invoices where user_id = ${userId})`;
      await tx`delete from invoices where user_id = ${userId}`;
      await tx`delete from milestones where project_id in (select id from projects where user_id = ${userId})`;
      await tx`delete from projects where user_id = ${userId}`;
      await tx`delete from proposal_items where proposal_id in (select id from proposals where user_id = ${userId})`;
      await tx`delete from proposal_milestones where proposal_id in (select id from proposals where user_id = ${userId})`;
      await tx`delete from proposals where user_id = ${userId}`;
      await tx`delete from clients where user_id = ${userId}`;
      await tx`delete from activity_logs where user_id = ${userId}`;
      await tx`delete from email_sends where user_id = ${userId}`;
      await tx`delete from invoice_counters where user_id = ${userId}`;
      await tx`delete from subscriptions where user_id = ${userId}`;
      await tx`delete from plan_grants where email = (select lower(email) from users where id = ${userId})`;
    });
    await resetBranding(sql, userId);
  } finally {
    await sql.end();
  }
}

/** Clears the test account's branding and deletes its logo from ImageKit. */
async function resetBranding(sql: ReturnType<typeof testDb>, userId: string) {
  const [row] = await sql<{ logo_file_id: string | null }[]>`
    select logo_file_id from users where id = ${userId}
  `;
  await sql`
    update users set brand_color = null, testimonial_quote = null,
      testimonial_author = null, logo_url = null, logo_file_id = null,
      logo_updated_at = null
    where id = ${userId}
  `;
  const key = process.env.IMAGEKIT_PRIVATE_KEY;
  if (!row?.logo_file_id || !key) return;
  await fetch(`https://api.imagekit.io/v1/files/${row.logo_file_id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}`,
    },
  });
}
