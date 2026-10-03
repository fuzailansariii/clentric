import { readFileSync } from "node:fs";
import path from "node:path";
import {
  Document,
  Image,
  Link,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { formatCurrency, formatNumber } from "@/lib/format-currency";
import { formatDate } from "@/lib/format-date";
import { formatInvoiceNumber } from "@/lib/format-invoice-number";
import { formatIssuer } from "@/lib/format-issuer";
import { formatProfession } from "@/lib/professions";
import { formatWebsite } from "@/lib/format-website";
import {
  PAYMENT_METHOD_LABELS,
  type PaymentMethodDetails,
} from "@/lib/payment-methods";
import {
  formatLineItemQuantity,
  formatLineItemRate,
} from "@/lib/format-line-item";
import { invoiceStatusConfig } from "./invoice-status-config";
import { pdfFonts } from "./invoice-pdf-fonts";
import type { InvoicePdfData } from "./queries";

/**
 * The "Modern" invoice template, ported from the Claude Design mockup
 * "Clentric Invoice". Sizes are the mockup's, converted to points
 * (1px = 0.75pt, 1in = 72pt).
 */

// Bytes, not a path: react-pdf treats a string src as a URL and fetches it.
const ICON = {
  data: readFileSync(path.join(process.cwd(), "app", "apple-icon.png")),
  format: "png" as const,
};
const DAY_MS = 86_400_000;

const c = {
  ink: "#111111",
  body: "#4a4a4a",
  muted: "#6b6b6b",
  rule: "#e1e1e1", // ink at 12% on white
  hairline: "#e7e7e7", // ink at 10% on white
  blue: "#2a44a8",
  blueBg: "#eef1fb",
};

const badgeTone = {
  draft: { bg: "#f0efec", fg: "#4a4a4a" },
  sent: { bg: "#eef1fb", fg: "#2a44a8" },
  overdue: { bg: "#fbe2dc", fg: "#a3361f" },
  paid: { bg: "#dcf3e6", fg: "#1f6b43" },
} as const;

const display = { fontFamily: pdfFonts.display, fontWeight: 600 } as const;
const strong = { fontFamily: pdfFonts.sans, fontWeight: 600 } as const;

const s = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 32,
    paddingHorizontal: 43,
    fontFamily: pdfFonts.sans,
    fontWeight: 400,
    fontSize: 10,
    lineHeight: 1.45,
    color: c.ink,
  },
  label: { color: c.muted, fontSize: 8.5 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  brand: { flexDirection: "row", alignItems: "center" },
  monogram: {
    width: 31.5,
    height: 31.5,
    borderRadius: 6,
    backgroundColor: c.ink,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },
  monogramText: { ...display, color: "#ffffff", fontSize: 14, lineHeight: 1 },
  brandName: { ...strong, fontSize: 13, lineHeight: 1.25 },
  brandSub: { color: c.muted, fontSize: 9.5 },
  title: {
    ...display,
    fontSize: 28,
    letterSpacing: -1,
    lineHeight: 1,
    textAlign: "right",
  },
  numberRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 6,
  },
  number: { ...display, fontSize: 11 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    height: 15,
    paddingHorizontal: 6,
    borderRadius: 7.5,
    marginLeft: 6,
  },
  badgeDot: { width: 4.5, height: 4.5, borderRadius: 2.25, marginRight: 4 },
  badgeText: { ...strong, fontSize: 8, lineHeight: 1 },

  meta: {
    flexDirection: "row",
    marginTop: 21.6,
    borderTopWidth: 1.1,
    borderTopColor: c.ink,
    borderBottomWidth: 0.75,
    borderBottomColor: c.rule,
  },
  metaCell: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 9,
    borderLeftWidth: 0.75,
    borderLeftColor: c.rule,
  },
  metaValue: { marginTop: 1.5 },

  parties: { flexDirection: "row", marginTop: 16 },
  party: { flex: 1, paddingRight: 18 },
  partyName: { ...strong, marginTop: 4.5 },
  partyLine: { color: c.body },

  tableHead: {
    flexDirection: "row",
    marginTop: 18,
    paddingBottom: 6,
    borderBottomWidth: 0.75,
    borderBottomColor: c.ink,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 6,
    borderBottomWidth: 0.75,
    borderBottomColor: c.hairline,
  },
  colDesc: { flex: 1, paddingRight: 6 },
  colQty: { width: 81, paddingHorizontal: 6, textAlign: "right" },
  colRate: { width: 81, paddingHorizontal: 6, textAlign: "right" },
  colAmount: { width: 87, paddingLeft: 6, textAlign: "right" },
  num: { ...display, fontSize: 9.5 },

  summary: { flexDirection: "row", marginTop: 13, alignItems: "flex-start" },
  notes: { flex: 1, paddingRight: 21, paddingTop: 1.5, color: c.body },
  totals: { width: 223 },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3.75,
  },
  dueBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
    paddingVertical: 9,
    paddingHorizontal: 10.5,
    borderRadius: 6,
  },
  dueLabel: { ...strong },
  dueAmount: { ...display, fontSize: 18, letterSpacing: -0.5, lineHeight: 1 },
  dueNote: {
    color: c.muted,
    fontSize: 8.5,
    textAlign: "right",
    marginTop: 4.5,
  },

  spacer: { flexGrow: 1, minHeight: 14 },
  payBox: {
    flexDirection: "row",
    borderWidth: 0.75,
    borderColor: c.rule,
    borderRadius: 6,
  },
  payMain: { flex: 1.3, paddingVertical: 9, paddingHorizontal: 12 },
  payTitle: { ...strong, marginBottom: 4.5 },
  payRow: { flexDirection: "row", fontSize: 9, marginBottom: 2.25 },
  payKey: { color: c.muted, width: 118, paddingRight: 12 },
  payValue: { flex: 1 },
  paySide: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 12,
    backgroundColor: c.blueBg,
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
  },
  paySideTitle: { ...strong, color: c.blue, marginBottom: 4.5 },
  paySideText: { fontSize: 9, color: c.blue },
  paySideLink: {
    ...display,
    fontSize: 10,
    color: c.blue,
    textDecoration: "none",
    marginTop: 9,
  },

  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10.5,
    fontSize: 8.5,
    color: c.muted,
  },
  made: { flexDirection: "row", alignItems: "center" },
  madeIcon: { width: 9, height: 9, borderRadius: 2.25, marginRight: 4.5 },

  // Anchored to the table header, where the mockup places it, so it never
  // lands on the parties block whatever their length.
  stamp: {
    position: "absolute",
    right: 22,
    top: 8,
    paddingVertical: 4.5,
    paddingHorizontal: 12,
    borderWidth: 2.25,
    borderRadius: 6,
    opacity: 0.85,
    transform: "rotate(-12deg)",
  },
  // Tracking stays small: wide letter-spacing breaks PDF text extraction
  // ("OV ERDU E") in Space Grotesk.
  stampText: { ...display, fontSize: 26, lineHeight: 1, letterSpacing: 0.6 },
});

/** "MO" from "Maya Okafor Studio". */
function monogram(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters =
    words.length > 1 ? words[0][0] + words[1][0] : name.slice(0, 2);
  return letters.toUpperCase() || "—";
}

/** "Net 14" from the issue and due dates. */
function terms(issueDate: string, dueDate: string): string {
  const days = Math.round(
    (new Date(dueDate).getTime() - new Date(issueDate).getTime()) / DAY_MS,
  );
  return days <= 0 ? "Due on receipt" : `Net ${days}`;
}

/** Label/value rows for the "How to pay" grid. */
function paymentRows(method: PaymentMethodDetails): [string, string][] {
  const rows: [string, string | null][] =
    method.type === "bank"
      ? [
          [PAYMENT_METHOD_LABELS.bank, method.bankName],
          ["Account name", method.accountHolder],
          ["Account", method.accountNumber],
          ["IFSC / SWIFT / IBAN", method.routingCode],
        ]
      : method.type === "paypal"
        ? [[PAYMENT_METHOD_LABELS.paypal, method.paypalEmail]]
        : method.type === "wise"
          ? [[PAYMENT_METHOD_LABELS.wise, method.wiseAccount]]
          : [[PAYMENT_METHOD_LABELS.upi, method.upiId]];
  return rows.filter((row): row is [string, string] => Boolean(row[1]));
}

export function ModernInvoicePdfDocument({
  data,
  showBranding = true,
  renderedAt,
}: {
  data: InvoicePdfData;
  showBranding?: boolean;
  /** When the PDF is made, for "N days past due". */
  renderedAt: number;
}) {
  const { invoice, items, profile } = data;
  const status = invoice.status;
  const money = (value: string) => formatCurrency(value, invoice.currency);
  const invoiceNumber = formatInvoiceNumber(
    invoice.invoiceNumber,
    invoice.numberPrefix,
  );
  const issuer = formatIssuer(profile);
  const firstName = profile.name?.trim().split(/\s+/)[0] || issuer.title;
  const profession = formatProfession(profile.profession);
  const tone = badgeTone[status];
  const isPaid = status === "paid";
  const isOverdue = status === "overdue";
  const daysLate = Math.max(
    1,
    Math.floor((renderedAt - new Date(invoice.dueDate).getTime()) / DAY_MS),
  );

  const fromLines = [
    profile.address?.split(/\r?\n/).join(", "),
    [
      profile.email,
      profile.website ? formatWebsite(profile.website) : null,
      // Non-breaking space keeps "Tax ID" on one line.
      profile.taxId ? `Tax ID ${profile.taxId}` : null,
    ]
      .filter(Boolean)
      .join(" · "),
  ].filter((line): line is string => Boolean(line?.trim()));

  const billName = invoice.clientCompany?.trim() || invoice.clientName;
  const billLines = [
    billName !== invoice.clientName ? `Attn: ${invoice.clientName}` : null,
    invoice.clientCountry,
    invoice.clientEmail,
  ].filter((line): line is string => Boolean(line));

  const meta = [
    { label: "Issued", value: formatDate(invoice.issueDate) },
    {
      label: "Due",
      value: formatDate(invoice.dueDate),
      color: isOverdue ? badgeTone.overdue.fg : c.ink,
    },
    { label: "Terms", value: terms(invoice.issueDate, invoice.dueDate) },
    ...(invoice.projectTitle
      ? [{ label: "Project", value: invoice.projectTitle }]
      : []),
  ];

  const dueBox = isPaid
    ? { label: "Paid in full", ...badgeTone.paid }
    : isOverdue
      ? { label: "Amount overdue", ...badgeTone.overdue }
      : { label: "Amount due", bg: c.ink, fg: "#ffffff" };
  const dueNote = isPaid
    ? invoice.paidAt
      ? `Payment confirmed ${formatDate(invoice.paidAt)}. Thank you.`
      : "Payment confirmed. Thank you."
    : isOverdue
      ? `${daysLate} ${daysLate === 1 ? "day" : "days"} past due · please pay at your earliest convenience`
      : `${invoice.currency} · due by ${formatDate(invoice.dueDate)}`;

  const stamp = isPaid
    ? { text: "PAID", color: badgeTone.paid.fg }
    : isOverdue
      ? { text: "OVERDUE", color: badgeTone.overdue.fg }
      : status === "draft"
        ? { text: "DRAFT", color: "#9a9a9a" }
        : null;

  const methods = invoice.payment.methods;
  const instructions = invoice.payment.instructions?.trim();
  const mailto = `mailto:${profile.email}?subject=${encodeURIComponent(
    `Payment for ${invoiceNumber}`,
  )}`;

  return (
    <Document
      title={`Invoice ${invoiceNumber}`}
      author={issuer.title}
      subject={`Invoice ${invoiceNumber} for ${invoice.clientName}`}
      creator="Clentric"
    >
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View style={s.brand}>
            <View style={s.monogram}>
              <Text style={s.monogramText}>{monogram(issuer.title)}</Text>
            </View>
            <View>
              <Text style={s.brandName}>{issuer.title}</Text>
              {profession ? <Text style={s.brandSub}>{profession}</Text> : null}
            </View>
          </View>
          <View>
            <Text style={s.title}>Invoice</Text>
            <View style={s.numberRow}>
              <Text style={s.number}>{invoiceNumber}</Text>
              <View style={[s.badge, { backgroundColor: tone.bg }]}>
                <View style={[s.badgeDot, { backgroundColor: tone.fg }]} />
                <Text style={[s.badgeText, { color: tone.fg }]}>
                  {invoiceStatusConfig[status].label}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={s.meta}>
          {meta.map((cell, index) => (
            <View
              key={cell.label}
              style={[
                s.metaCell,
                index === 0 ? { paddingLeft: 0, borderLeftWidth: 0 } : {},
                index === meta.length - 1 ? { paddingRight: 0 } : {},
              ]}
            >
              <Text style={s.label}>{cell.label}</Text>
              <Text style={[s.metaValue, { color: cell.color ?? c.ink }]}>
                {cell.value}
              </Text>
            </View>
          ))}
        </View>

        <View style={s.parties}>
          <View style={s.party}>
            <Text style={s.label}>From</Text>
            <Text style={s.partyName}>{issuer.title}</Text>
            {fromLines.map((line, index) => (
              <Text key={index} style={s.partyLine}>
                {line}
              </Text>
            ))}
          </View>
          <View style={[s.party, { paddingRight: 0 }]}>
            <Text style={s.label}>Bill to</Text>
            <Text style={s.partyName}>{billName}</Text>
            {billLines.map((line, index) => (
              <Text key={index} style={s.partyLine}>
                {line}
              </Text>
            ))}
          </View>
        </View>

        {/* A column wrapper: an absolute child of a row collapses to zero
            width in react-pdf. */}
        <View>
          <View style={s.tableHead}>
            <Text style={[s.label, s.colDesc]}>Description</Text>
            <Text style={[s.label, s.colQty]}>Qty</Text>
            <Text style={[s.label, s.colRate]}>Rate</Text>
            <Text style={[s.label, s.colAmount]}>Amount</Text>
          </View>
          {stamp ? (
            <View style={[s.stamp, { borderColor: stamp.color }]}>
              <Text style={[s.stampText, { color: stamp.color }]}>
                {stamp.text}
              </Text>
            </View>
          ) : null}
        </View>
        {items.map((item) => (
          <View key={item.id} style={s.row} wrap={false}>
            <Text style={s.colDesc}>{item.description}</Text>
            <Text style={[s.colQty, s.num]}>
              {formatLineItemQuantity(item.quantity, item.unit)}
            </Text>
            <Text style={[s.colRate, s.num]}>
              {formatLineItemRate(item.rate, item.unit)}
            </Text>
            <Text style={[s.colAmount, s.num]}>{money(item.amount)}</Text>
          </View>
        ))}

        <View style={s.summary} wrap={false}>
          <View style={s.notes}>
            {invoice.notes?.trim() ? (
              <>
                <Text style={[s.label, { marginBottom: 4.5 }]}>Notes</Text>
                <Text style={{ fontSize: 9.5 }}>{invoice.notes}</Text>
              </>
            ) : null}
          </View>
          <View style={s.totals}>
            <View style={s.totalsRow}>
              <Text style={{ color: c.muted }}>Subtotal</Text>
              <Text style={s.num}>{money(invoice.subTotal)}</Text>
            </View>
            {Number(invoice.taxAmount) > 0 ? (
              <View style={s.totalsRow}>
                <Text style={{ color: c.muted }}>
                  Tax ({formatNumber(Number(invoice.taxRate))}%)
                </Text>
                <Text style={s.num}>{money(invoice.taxAmount)}</Text>
              </View>
            ) : null}
            <View style={[s.dueBox, { backgroundColor: dueBox.bg }]}>
              <Text style={[s.dueLabel, { color: dueBox.fg }]}>
                {dueBox.label}
              </Text>
              <Text style={[s.dueAmount, { color: dueBox.fg }]}>
                {money(invoice.total)}
              </Text>
            </View>
            <Text style={s.dueNote}>{dueNote}</Text>
          </View>
        </View>

        <View style={s.spacer} />

        <View wrap={false}>
          <View style={s.payBox}>
            <View style={s.payMain}>
              <Text style={s.payTitle}>How to pay</Text>
              {methods.flatMap((method) =>
                paymentRows(method).map(([key, value]) => (
                  <View key={`${method.type}-${key}`} style={s.payRow}>
                    <Text style={s.payKey}>{key}</Text>
                    <Text style={s.payValue}>{value}</Text>
                  </View>
                )),
              )}
              {instructions ? (
                <Text style={{ fontSize: 9, marginBottom: 2.25 }}>
                  {instructions}
                </Text>
              ) : null}
              {methods.length === 0 && !instructions ? (
                <Text style={{ fontSize: 9, marginBottom: 2.25 }}>
                  Ask {profile.email} for payment details.
                </Text>
              ) : null}
              <View style={s.payRow}>
                <Text style={s.payKey}>Reference</Text>
                <Text style={[s.payValue, s.num, { fontSize: 9 }]}>
                  {invoiceNumber}
                </Text>
              </View>
            </View>
            <View style={s.paySide}>
              <Text style={s.paySideTitle}>
                {isPaid ? "Paid in full" : "Already paid?"}
              </Text>
              <Text style={s.paySideText}>
                {isPaid
                  ? `Thank you. ${firstName} has marked this invoice as paid.`
                  : `Reply to ${firstName} and let them know. No account needed.`}
              </Text>
              {isPaid ? null : (
                <Link src={mailto} style={s.paySideLink}>
                  {profile.email}
                  {/* Space Grotesk has no arrow glyph. */}
                  <Text style={{ fontFamily: pdfFonts.sans }}> →</Text>
                </Link>
              )}
            </View>
          </View>

          <View style={s.footer}>
            <Text>Questions about this invoice? {profile.email}</Text>
            {showBranding ? (
              <View style={s.made}>
                {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt */}
                <Image src={ICON} style={s.madeIcon} />
                <Text>Made with Clentric</Text>
              </View>
            ) : null}
          </View>
        </View>
      </Page>
    </Document>
  );
}
