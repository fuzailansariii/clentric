import { config } from "dotenv";
import postgres from "postgres";

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
      await tx`delete from invoice_counters where user_id = ${userId}`;
    });
  } finally {
    await sql.end();
  }
}
