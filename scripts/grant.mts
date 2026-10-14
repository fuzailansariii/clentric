/**
 * Free Pro access by email, run by the owner from their machine:
 *   npm run grant add friend@x.com                    (no end date)
 *   npm run grant add friend@x.com 2027-01-01 invite beta tester
 *   npm run grant revoke friend@x.com
 *   npm run grant list
 * "invite" also emails them a sign-up link. Plain words, no --flags:
 * PowerShell drops the "--" that npm needs for flags.
 */
import postgres from "postgres";
import { Resend } from "resend";
import { grantInviteEmail } from "@/lib/email/templates";
import { LEGAL } from "@/lib/legal-config";

const [command, ...rest] = process.argv.slice(2);

function fail(message: string): never {
  console.error(message);
  console.error("Usage: npm run grant add <email> [YYYY-MM-DD] [invite] [note] | revoke <email> | list");
  process.exit(1);
}

function parseEmail(value: string | undefined): string {
  const email = value?.trim().toLowerCase() ?? "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(`Not an email: "${value ?? ""}"`);
  return email;
}

// Same reserved names sendEmail() skips: they can never receive mail.
const RESERVED_DOMAIN = /(^|\.)(example\.(com|net|org)|test|example|invalid|localhost)$/i;

async function sendInvite(email: string, expiresAt: Date | null) {
  if (RESERVED_DOMAIN.test(email.split("@")[1] ?? "")) {
    console.log(`Invite email skipped: ${email} is a test address.`);
    return;
  }
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) fail("Grant saved, but RESEND_API_KEY is missing, so no invite email was sent.");

  const appUrl = (process.env.APP_URL ?? LEGAL.siteUrl).replace(/\/+$/, "");
  const until = expiresAt
    ? expiresAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
    : null;
  const message = grantInviteEmail({
    email,
    registerUrl: `${appUrl}/register?email=${encodeURIComponent(email)}`,
    until,
  });

  const { data, error } = await new Resend(apiKey).emails.send({
    from: `${LEGAL.productName} <${process.env.EMAIL_FROM ?? `noreply@${LEGAL.domain}`}>`,
    to: email,
    replyTo: process.env.SUPPORT_EMAIL ?? LEGAL.supportEmail,
    ...message,
  });
  if (error || !data) {
    fail(`Grant saved, but the invite email failed (${error?.message ?? "no id"}). Run the same command again to resend.`);
  }
  console.log(`Invite emailed to ${email} (link goes to ${appUrl}).`);
}

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) fail("DIRECT_URL or DATABASE_URL is missing from .env.");
if (!["add", "revoke", "list"].includes(command ?? "")) fail(`Unknown command "${command ?? ""}".`);

const sql = postgres(url, { max: 1, prepare: false });

async function main() {
  if (command === "list") {
    const rows = await sql`
      select g.email, g.plan, g.expires_at, g.note, (u.id is not null) as signed_up, g.created_at
      from plan_grants g left join users u on lower(u.email) = g.email and u.deleted_at is null
      where g.revoked_at is null order by g.created_at desc`;
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

  // add: an optional date, an optional "invite", then the rest is the note.
  let until: string | null = null;
  let noteWords = rest.slice(1);
  if (noteWords[0] && /^\d{4}-\d{2}-\d{2}$/.test(noteWords[0])) {
    until = noteWords[0];
    noteWords = noteWords.slice(1);
  }
  const invite = noteWords[0]?.toLowerCase() === "invite";
  if (invite) noteWords = noteWords.slice(1);
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

  if (invite) {
    // Lets them through the invite-only sign-up hook while it is still on.
    await sql`
      insert into beta_invites (email, note) values (${email}, ${note ?? "pro grant"})
      on conflict (email) do nothing`;
    await sendInvite(email, expiresAt);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
