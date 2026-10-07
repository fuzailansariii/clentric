import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/src/db";
import { proposals } from "@/src/db/schema/proposals";
import { AppError } from "@/lib/errors";
import { formatCurrency } from "@/lib/format-currency";
import { formatDate } from "@/lib/format-date";
import { formatInvoiceNumber } from "@/lib/format-invoice-number";
import { formatIssuer } from "@/lib/format-issuer";
import { logoSrc } from "@/lib/logo-url";
import {
  issuerUserColumns,
  liveIssuer,
  resolveIssuer,
  type IssuerDetails,
} from "@/lib/issuer-snapshot";
import { getInvoicePdfDataForOwner } from "@/app/(dashboard)/invoices/queries";
import { renderInvoicePdf } from "@/app/(dashboard)/invoices/render-invoice-pdf";
import { emailConfig } from "./config";
import { finishEmailSend, reserveEmailSend } from "./quota";
import { sendEmail, type EmailMessage } from "./send-email";
import { invoiceEmail, proposalEmail, reminderEmail } from "./templates";

const NO_CLIENT_EMAIL = "Add an email address to this client first.";
const SEND_FAILED =
  "The email couldn't be sent just now. Try again in a few minutes.";

const DAY_MS = 86_400_000;

function sender(issuer: IssuerDetails, logoUrl: string | null) {
  const { title } = formatIssuer(issuer);
  return {
    name: title,
    fromName: `${title} via Clentric`,
    logo: logoUrl ? { src: logoSrc(logoUrl, "document"), alt: title } : null,
  };
}

/** Claims a slot, sends, and records the outcome. Throws AppError on failure. */
async function deliver(
  reservation: Parameters<typeof reserveEmailSend>[0],
  buildMessage: () => Promise<EmailMessage>,
): Promise<"sent" | "skipped"> {
  const sendId = await reserveEmailSend(reservation);

  let result: Awaited<ReturnType<typeof sendEmail>>;
  try {
    result = await sendEmail({
      ...(await buildMessage()),
      idempotencyKey: sendId,
    });
  } catch (error) {
    await finishEmailSend(sendId, reservation.userId, { status: "failed" });
    throw error;
  }

  await finishEmailSend(sendId, reservation.userId, result);
  if (result.status === "failed")
    throw new AppError("EMAIL_FAILED", SEND_FAILED);
  return result.status;
}

/**
 * Emails an invoice (or a reminder about it) to its client, with the PDF
 * attached. `userId` is the owner, taken from the session or the database;
 * the caller has already checked status.
 */
export async function emailInvoice(input: {
  userId: string;
  invoiceId: string;
  kind: "invoice" | "reminder";
}): Promise<"sent" | "skipped"> {
  const data = await getInvoicePdfDataForOwner(input.invoiceId, input.userId);
  if (!data) throw new AppError("NOT_FOUND", "Invoice not found");

  const { invoice, profile } = data;
  const to = invoice.clientEmail?.trim();
  if (!to) throw new AppError("NO_CLIENT_EMAIL", NO_CLIENT_EMAIL);

  const from = sender(profile, data.logoUrl);
  const invoiceNumber = formatInvoiceNumber(
    invoice.invoiceNumber,
    invoice.numberPrefix,
  );
  const details = {
    logo: from.logo,
    senderName: from.name,
    clientName: invoice.clientName,
    invoiceNumber,
    amount: formatCurrency(invoice.total, invoice.currency),
    dueDate: formatDate(invoice.dueDate),
  };

  return deliver(
    {
      userId: input.userId,
      kind: input.kind,
      entityId: input.invoiceId,
      recipient: to,
      noun: "invoice",
    },
    async () => {
      const email =
        input.kind === "invoice"
          ? invoiceEmail(details)
          : reminderEmail({
              ...details,
              daysOverdue: Math.floor(
                (Date.now() - new Date(invoice.dueDate).getTime()) / DAY_MS,
              ),
            });
      // TODO(billing): showBranding follows the plan, same as the download.
      const pdf = await renderInvoicePdf(data, true);

      return {
        ...email,
        to,
        fromName: from.fromName,
        replyTo: profile.email,
        attachments: [{ filename: `${invoiceNumber}.pdf`, content: pdf }],
      };
    },
  );
}

/** Emails a sent proposal's public link to its client. */
export async function emailProposal(input: {
  userId: string;
  proposalId: string;
}): Promise<"sent" | "skipped"> {
  const row = await db.query.proposals.findFirst({
    where: and(
      eq(proposals.id, input.proposalId),
      eq(proposals.userId, input.userId),
      isNull(proposals.deletedAt),
    ),
    columns: {
      title: true,
      total: true,
      currency: true,
      token: true,
      status: true,
      expiresAt: true,
      issuerSnapshot: true,
    },
    with: {
      client: { columns: { name: true, email: true } },
      user: { columns: { ...issuerUserColumns, logoUrl: true } },
    },
  });

  if (!row || !row.user) throw new AppError("NOT_FOUND", "Proposal not found");
  if (row.status !== "sent" && row.status !== "viewed") {
    throw new AppError(
      "BAD_REQUEST",
      "Only a proposal waiting for a reply can be emailed.",
    );
  }

  const to = row.client.email?.trim();
  if (!to) throw new AppError("NO_CLIENT_EMAIL", NO_CLIENT_EMAIL);

  const profile = resolveIssuer(row.issuerSnapshot, liveIssuer(row.user));
  const from = sender(profile, row.user.logoUrl);
  const email = proposalEmail({
    logo: from.logo,
    senderName: from.name,
    clientName: row.client.name,
    title: row.title,
    amount: formatCurrency(row.total, row.currency),
    expiresOn: row.expiresAt ? formatDate(row.expiresAt) : null,
    url: `${emailConfig().appUrl}/p/${row.token}`,
  });

  return deliver(
    {
      userId: input.userId,
      kind: "proposal",
      entityId: input.proposalId,
      recipient: to,
      noun: "proposal",
    },
    async () => ({
      ...email,
      to,
      fromName: from.fromName,
      replyTo: profile.email,
    }),
  );
}
