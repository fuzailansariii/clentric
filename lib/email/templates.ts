import { LEGAL } from "@/lib/legal-config";

/**
 * Client emails as HTML (inline styles, table layout, so Gmail and Outlook
 * agree) plus a plain-text twin. Every user-typed value goes through
 * escapeHtml before it reaches the HTML.
 */

export type RenderedEmail = { subject: string; html: string; text: string };

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

type Row = { label: string; value: string };

function layout(input: {
  preheader: string;
  heading: string;
  paragraphs: string[];
  rows: Row[];
  button?: { label: string; url: string };
  closing: string;
}): string {
  const e = escapeHtml;
  const paragraphs = input.paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#27272a">${e(p)}</p>`,
    )
    .join("");
  const rows = input.rows
    .map(
      (row) =>
        `<tr><td style="padding:8px 0;font-size:14px;color:#71717a">${e(row.label)}</td><td style="padding:8px 0;font-size:14px;color:#18181b;text-align:right;font-weight:600">${e(row.value)}</td></tr>`,
    )
    .join("");
  const button = input.button
    ? `<p style="margin:24px 0"><a href="${e(input.button.url)}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 22px;border-radius:6px">${e(input.button.label)}</a></p><p style="margin:0 0 16px;font-size:13px;line-height:1.5;color:#71717a">Or open this link: <a href="${e(input.button.url)}" style="color:#3f3f46;word-break:break-all">${e(input.button.url)}</a></p>`
    : "";

  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(input.heading)}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<div style="display:none;max-height:0;overflow:hidden">${e(input.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e4e4e7;border-radius:8px">
<tr><td style="padding:32px">
<h1 style="margin:0 0 20px;font-size:20px;line-height:1.3;color:#18181b">${e(input.heading)}</h1>
${paragraphs}
${rows ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e4e4e7;border-bottom:1px solid #e4e4e7;margin:8px 0 16px">${rows}</table>` : ""}
${button}
<p style="margin:16px 0 0;font-size:15px;line-height:1.6;color:#27272a">${e(input.closing)}</p>
</td></tr>
</table>
<p style="margin:16px 0 0;font-size:12px;color:#a1a1aa">Sent with <a href="${e(LEGAL.siteUrl)}" style="color:#71717a">${e(LEGAL.productName)}</a></p>
</td></tr>
</table>
</body>
</html>`;
}

function plainText(input: {
  paragraphs: string[];
  rows: Row[];
  link?: string;
  closing: string;
}): string {
  return [
    ...input.paragraphs,
    "",
    ...input.rows.map((row) => `${row.label}: ${row.value}`),
    ...(input.link ? ["", input.link] : []),
    "",
    input.closing,
    "",
    `Sent with ${LEGAL.productName} - ${LEGAL.siteUrl}`,
  ].join("\n");
}

function greeting(clientName: string) {
  const name = clientName.trim();
  return name ? `Hi ${name},` : "Hi,";
}

export function invoiceEmail(input: {
  senderName: string;
  clientName: string;
  invoiceNumber: string;
  amount: string;
  dueDate: string;
}): RenderedEmail {
  const paragraphs = [
    greeting(input.clientName),
    `${input.senderName} has sent you invoice ${input.invoiceNumber}. The PDF is attached and includes how to pay.`,
  ];
  const rows = [
    { label: "Invoice", value: input.invoiceNumber },
    { label: "Amount due", value: input.amount },
    { label: "Due date", value: input.dueDate },
  ];
  const closing = "Questions about this invoice? Just reply to this email.";

  return {
    subject: `Invoice ${input.invoiceNumber} from ${input.senderName}`,
    html: layout({
      preheader: `${input.amount} due ${input.dueDate}`,
      heading: `Invoice ${input.invoiceNumber}`,
      paragraphs,
      rows,
      closing,
    }),
    text: plainText({ paragraphs, rows, closing }),
  };
}

export function reminderEmail(input: {
  senderName: string;
  clientName: string;
  invoiceNumber: string;
  amount: string;
  dueDate: string;
  /** Whole days past due; 0 or less when not overdue yet. */
  daysOverdue: number;
}): RenderedEmail {
  const overdue = input.daysOverdue > 0;
  const status = overdue
    ? `was due on ${input.dueDate} (${input.daysOverdue} ${input.daysOverdue === 1 ? "day" : "days"} ago)`
    : `is due on ${input.dueDate}`;
  const paragraphs = [
    greeting(input.clientName),
    `A friendly reminder from ${input.senderName}: invoice ${input.invoiceNumber} for ${input.amount} ${status}. The invoice is attached again with how to pay.`,
    "If you've already paid, thank you, and you can ignore this email.",
  ];
  const rows = [
    { label: "Invoice", value: input.invoiceNumber },
    { label: "Amount due", value: input.amount },
    { label: overdue ? "Was due" : "Due date", value: input.dueDate },
  ];
  const closing = "Questions? Just reply to this email.";

  return {
    subject: `${overdue ? "Overdue" : "Reminder"}: invoice ${input.invoiceNumber} from ${input.senderName}`,
    html: layout({
      preheader: `${input.amount} ${status}`,
      heading: overdue
        ? `Invoice ${input.invoiceNumber} is overdue`
        : `Reminder: invoice ${input.invoiceNumber}`,
      paragraphs,
      rows,
      closing,
    }),
    text: plainText({ paragraphs, rows, closing }),
  };
}

export function proposalEmail(input: {
  senderName: string;
  clientName: string;
  title: string;
  amount: string;
  /** Formatted date, or null when the link never expires. */
  expiresOn: string | null;
  url: string;
}): RenderedEmail {
  const paragraphs = [
    greeting(input.clientName),
    `${input.senderName} has sent you a proposal: "${input.title}". You can read it and accept or decline it online. No account needed.`,
  ];
  const rows = [
    { label: "Proposal", value: input.title },
    { label: "Total", value: input.amount },
    ...(input.expiresOn
      ? [{ label: "Valid until", value: input.expiresOn }]
      : []),
  ];
  const closing = "Questions about the proposal? Just reply to this email.";

  return {
    subject: `${input.senderName} sent you a proposal: ${input.title}`,
    html: layout({
      preheader: `${input.title}: ${input.amount}`,
      heading: input.title,
      paragraphs,
      rows,
      button: { label: "View proposal", url: input.url },
      closing,
    }),
    text: plainText({ paragraphs, rows, link: input.url, closing }),
  };
}
