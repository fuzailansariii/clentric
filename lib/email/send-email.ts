import "server-only";
import { Resend } from "resend";
import { logError } from "@/lib/errors";
import { emailConfig } from "./config";

export type EmailMessage = {
  to: string;
  subject: string;
  /** Omit for a plain-text email. */
  html?: string;
  text: string;
  /** Shown before the address, e.g. "Alex Doe via Clentric". */
  fromName: string;
  replyTo?: string;
  attachments?: { filename: string; content: Buffer }[];
  /** Makes a retried request send once. */
  idempotencyKey?: string;
};

export type EmailResult =
  | { status: "sent"; providerId: string }
  | { status: "skipped" }
  | { status: "failed" };

// RFC 2606 / 6761 names that can never receive mail (the e2e tests use them).
const RESERVED_DOMAIN =
  /(^|\.)(example\.(com|net|org)|test|example|invalid|localhost)$/i;

let client: Resend | null = null;

/** Quotes a display name so a user's name can't break the From header. */
function displayName(name: string) {
  const clean = name.replace(/["\\<>\r\n]/g, "").trim();
  return clean ? `"${clean}"` : "";
}

/** Sends one email. Never throws: failures are logged and reported. */
export async function sendEmail(message: EmailMessage): Promise<EmailResult> {
  const domain = message.to.split("@")[1] ?? "";
  if (RESERVED_DOMAIN.test(domain)) return { status: "skipped" };

  const { apiKey, fromAddress } = emailConfig();
  if (!apiKey) {
    logError("sendEmail", "RESEND_API_KEY is not set.");
    return { status: "failed" };
  }

  try {
    client ??= new Resend(apiKey);
    const { data, error } = await client.emails.send(
      {
        from: `${displayName(message.fromName)} <${fromAddress}>`.trim(),
        to: message.to,
        replyTo: message.replyTo,
        subject: message.subject.replace(/[\r\n]+/g, " "),
        html: message.html,
        text: message.text,
        attachments: message.attachments,
      },
      message.idempotencyKey
        ? { idempotencyKey: message.idempotencyKey }
        : undefined,
    );

    if (error || !data) {
      logError("sendEmail", error ?? "Resend returned no id.");
      return { status: "failed" };
    }
    return { status: "sent", providerId: data.id };
  } catch (error) {
    logError("sendEmail", error);
    return { status: "failed" };
  }
}
