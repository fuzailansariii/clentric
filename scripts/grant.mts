/**
 * Free Pro access by email, run by the owner from their machine:
 *   npm run grant add friend@x.com                    (no end date)
 *   npm run grant add friend@x.com 2027-01-01 beta tester
 *   npm run grant revoke friend@x.com
 *   npm run grant list
 * Plain words, no --flags: PowerShell drops the "--" that npm needs for flags.
 */
import postgres from "postgres";

const [command, ...rest] = process.argv.slice(2);

function fail(message: string): never {
  console.error(message);
  console.error("Usage: npm run grant add <email> [YYYY-MM-DD] [note] | revoke <email> | list");
  process.exit(1);
}

function parseEmail(value: string | undefined): string {
  const email = value?.trim().toLowerCase() ?? "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(`Not an email: "${value ?? ""}"`);
  return email;
}

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) fail("DIRECT_URL or DATABASE_URL is missing from .env.");
if (!["add", "revoke", "list"].includes(command ?? "")) fail(`Unknown command "${command ?? ""}".`);

const sql = postgres(url, { max: 1, prepare: false });

async function main() {
  if (command === "list") {
    const rows = await sql`
      select email, plan, expires_at, note, created_at from plan_grants
      where revoked_at is null order by created_at desc`;
    if (rows.length) console.table(rows);
    else console.log("No active grants.");
    return;
  }

  const email = parseEmail(rest[0]);

  if (command === "revoke") {
    const rows = await sql`
      update plan_grants set revoked_at = now()
      where email = ${email} and revoked_at is null returning email`;
    console.log(rows.length ? `Revoked ${email}.` : `No active grant for ${email}.`);
    return;
  }

  // add: an optional date, then the rest is the note.
  let until: string | null = null;
  let noteWords = rest.slice(1);
  if (noteWords[0] && /^\d{4}-\d{2}-\d{2}$/.test(noteWords[0])) {
    until = noteWords[0];
    noteWords = noteWords.slice(1);
  }
  const expiresAt = until ? new Date(`${until}T23:59:59Z`) : null;
  if (expiresAt && (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date())) {
    fail(`The end date must be in the future, got ${until}.`);
  }
  const note = noteWords.join(" ") || null;

  // Re-granting the same email updates the live grant instead of adding one.
  const [row] = await sql`
    insert into plan_grants (email, expires_at, note) values (${email}, ${expiresAt}, ${note})
    on conflict (email) where revoked_at is null
    do update set expires_at = excluded.expires_at, note = excluded.note
    returning email`;
  console.log(`Pro for ${row.email} ${until ? `until ${until}` : "with no end date"}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
