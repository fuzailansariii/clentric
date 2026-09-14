import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatCurrency, formatNumber } from "@/lib/format-currency";
import { formatDate } from "@/lib/format-date";
import { formatInvoiceNumber } from "@/lib/format-invoice-number";
import {
  formatLineItemQuantity,
  formatLineItemRate,
} from "@/lib/format-line-item";
import { invoiceStatusConfig } from "./invoice-status-config";
import { pdfFonts } from "./invoice-pdf-fonts";
import type { InvoicePdfData } from "./queries";

const colors = {
  ink: "#111111",
  muted: "#6b6b6b",
  faint: "#9ca3af", // --color-ink-400
  rule: "#d9d8d3", // ~ foreground at 12% on white — structural rules
  hairline: "#ecebe7", // ~ --border — row separators
  paper: "#f6f5f1", // --color-paper-50
  ledger: "#3454d1", // --color-ledger-600 / --primary
};

const toneInk: Record<string, string> = {
  info: colors.ledger,
  success: "#2f8f5b", // --color-success-600
  warning: "#c98a2c", // --color-warning-600
  danger: "#c0432c", // --color-danger-600
  neutral: "#6b7280", // --color-ink-600
};

const PAGE_X = 48;

const mono = { fontFamily: pdfFonts.mono, fontWeight: 400 } as const;
const monoStrong = { fontFamily: pdfFonts.mono, fontWeight: 600 } as const;
const sansStrong = { fontFamily: pdfFonts.sans, fontWeight: 600 } as const;

const styles = StyleSheet.create({
  page: {
    paddingTop: 52,
    paddingBottom: 76,
    paddingHorizontal: PAGE_X,
    fontFamily: pdfFonts.sans,
    fontWeight: 400,
    fontSize: 9.5,
    lineHeight: 1.45,
    color: colors.ink,
  },

  // Brand band across the top edge of every page.
  band: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: colors.ledger,
  },

  label: {
    ...sansStrong,
    fontSize: 7.5,
    letterSpacing: 0.7,
    textTransform: "uppercase",
    color: colors.muted,
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingBottom: 22,
    borderBottomWidth: 2,
    borderBottomColor: colors.rule,
  },
  eyebrow: {
    fontFamily: pdfFonts.display,
    fontWeight: 700,
    fontSize: 8.5,
    letterSpacing: 0.7,
    textTransform: "uppercase",
    color: colors.muted,
  },
  number: {
    ...monoStrong,
    fontSize: 24,
    letterSpacing: -0.5,
    lineHeight: 1.1,
    marginTop: 6,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "baseline",
    marginTop: 3,
  },
  metaLabel: { color: colors.muted, width: 62, textAlign: "right" },
  metaValue: { ...mono, fontSize: 9, width: 96, textAlign: "right" },

  // Parties
  parties: {
    flexDirection: "row",
    paddingVertical: 22,
    borderBottomWidth: 1,
    borderBottomColor: colors.rule,
  },
  party: { flex: 1, paddingRight: 18 },
  partyName: {
    ...sansStrong,
    fontSize: 11,
    lineHeight: 1.35,
    marginTop: 8,
  },
  partyLine: { color: colors.muted, marginTop: 1.5 },

  // Line items
  tableHead: {
    flexDirection: "row",
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.rule,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 9,
    borderBottomWidth: 0.75,
    borderBottomColor: colors.hairline,
  },
  colDescription: { flex: 1, paddingRight: 14 },
  // Wide enough for "12.5 days" in Roboto Mono.
  colQty: { width: 60, textAlign: "right" },
  colRate: { width: 82, textAlign: "right" },
  colAmount: { width: 92, textAlign: "right" },
  // Roboto Mono runs wider than Inter — a half-point smaller keeps
  // six-figure amounts inside their columns.
  cellNumber: { ...mono, fontSize: 9 },
  cellMuted: { color: colors.muted },

  // Stamp + totals
  summary: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 22,
  },
  stampSlot: { flex: 1, alignItems: "flex-start", paddingLeft: 10 },
  stampOuter: {
    borderWidth: 1.5,
    borderRadius: 5,
    padding: 2,
    opacity: 0.9,
    transform: "rotate(-6deg)",
  },
  stampInner: {
    borderWidth: 0.75,
    borderRadius: 3,
    paddingVertical: 6,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  stampLabel: {
    fontFamily: pdfFonts.display,
    fontWeight: 700,
    fontSize: 18,
    textTransform: "uppercase",
    lineHeight: 1,
  },
  stampDetail: {
    ...monoStrong,
    fontSize: 6.5,
    letterSpacing: 0.3,
    textTransform: "uppercase",
    marginTop: 5,
    paddingTop: 3,
    borderTopWidth: 0.5,
  },
  totals: { width: 236 },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    paddingVertical: 4,
  },
  totalsRowLast: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    paddingTop: 4,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: colors.rule,
  },
  grandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingTop: 12,
  },
  grandValue: {
    ...monoStrong,
    fontSize: 20,
    letterSpacing: -0.6,
    lineHeight: 1,
  },

  // Payment + contact
  closing: {
    flexDirection: "row",
    marginTop: 34,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.rule,
  },
  closingCol: { flex: 1, paddingRight: 18 },
  paymentBox: {
    marginTop: 8,
    padding: 10,
    backgroundColor: colors.paper,
    borderRadius: 3,
  },
  reference: { color: colors.muted, fontSize: 8.5, marginTop: 6 },

  // Footer on every page
  footer: {
    position: "absolute",
    bottom: 30,
    left: PAGE_X,
    right: PAGE_X,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 0.75,
    borderTopColor: colors.hairline,
  },
  footerText: { fontSize: 7.5, color: colors.faint },
});

function stampDetail(invoice: InvoicePdfData["invoice"]): string | null {
  switch (invoice.status) {
    case "paid":
      return invoice.paidAt ? formatDate(invoice.paidAt) : null;
    case "overdue":
      return `Was due ${formatDate(invoice.dueDate)}`;
    case "sent":
      return `Due ${formatDate(invoice.dueDate)}`;
    default:
      return "Not sent";
  }
}

export function InvoicePdfDocument({
  data,
  showBranding = true,
}: {
  data: InvoicePdfData;
  showBranding?: boolean;
}) {
  const { invoice, items, profile } = data;
  const invoiceNumber = formatInvoiceNumber(invoice.invoiceNumber);
  const statusInfo = invoiceStatusConfig[invoice.status];
  const stampInk = toneInk[statusInfo.variant] ?? toneInk.neutral;
  const detail = stampDetail(invoice);
  const issuerName = profile.name ?? profile.email;
  const clientCompany =
    invoice.clientCompany && invoice.clientCompany !== invoice.clientName
      ? invoice.clientCompany
      : null;

  return (
    <Document
      title={`Invoice ${invoiceNumber}`}
      author={issuerName}
      subject={`Invoice ${invoiceNumber} for ${invoice.clientName}`}
      creator="Clentric"
    >
      <Page size="A4" style={styles.page}>
        <View fixed style={styles.band} />

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>Invoice</Text>
            <Text style={styles.number}>{invoiceNumber}</Text>
          </View>
          <View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Issue date</Text>
              <Text style={styles.metaValue}>
                {formatDate(invoice.issueDate)}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Due date</Text>
              <Text style={[styles.metaValue, monoStrong]}>
                {formatDate(invoice.dueDate)}
              </Text>
            </View>
          </View>
        </View>

        {/* Parties */}
        <View style={styles.parties}>
          <View style={styles.party}>
            <Text style={styles.label}>From</Text>
            <Text style={styles.partyName}>{issuerName}</Text>
            {profile.profession ? (
              <Text style={styles.partyLine}>{profile.profession}</Text>
            ) : null}
            {profile.name ? (
              <Text style={styles.partyLine}>{profile.email}</Text>
            ) : null}
          </View>

          <View style={styles.party}>
            <Text style={styles.label}>Bill to</Text>
            <Text style={styles.partyName}>{invoice.clientName}</Text>
            {clientCompany ? (
              <Text style={styles.partyLine}>{clientCompany}</Text>
            ) : null}
            {invoice.clientEmail ? (
              <Text style={styles.partyLine}>{invoice.clientEmail}</Text>
            ) : null}
            {invoice.clientCountry ? (
              <Text style={styles.partyLine}>{invoice.clientCountry}</Text>
            ) : null}
          </View>

          {invoice.projectTitle ? (
            <View style={[styles.party, { paddingRight: 0 }]}>
              <Text style={styles.label}>Project</Text>
              <Text style={styles.partyName}>{invoice.projectTitle}</Text>
            </View>
          ) : null}
        </View>

        {/* Line items */}
        <View style={styles.tableHead}>
          <Text style={[styles.label, styles.colDescription]}>Description</Text>
          <Text style={[styles.label, styles.colQty]}>Qty</Text>
          <Text style={[styles.label, styles.colRate]}>Rate</Text>
          <Text style={[styles.label, styles.colAmount]}>Amount</Text>
        </View>

        {items.map((item) => (
          // wrap={false}: a row moves to the next page whole rather than
          // splitting a description across the page break.
          <View key={item.id} style={styles.row} wrap={false}>
            <Text style={styles.colDescription}>{item.description}</Text>
            <Text style={[styles.colQty, styles.cellNumber, styles.cellMuted]}>
              {formatLineItemQuantity(item.quantity, item.unit)}
            </Text>
            <Text style={[styles.colRate, styles.cellNumber, styles.cellMuted]}>
              {formatLineItemRate(item.rate, item.unit)}
            </Text>
            <Text style={[styles.colAmount, styles.cellNumber]}>
              {formatCurrency(item.amount)}
            </Text>
          </View>
        ))}

        {/* Stamp + totals — kept together on one page. */}
        <View style={styles.summary} wrap={false}>
          <View style={styles.stampSlot}>
            <View
              style={[
                styles.stampOuter,
                { borderColor: stampInk, backgroundColor: `${stampInk}0D` },
              ]}
            >
              <View style={[styles.stampInner, { borderColor: stampInk }]}>
                <Text style={[styles.stampLabel, { color: stampInk }]}>
                  {statusInfo.label}
                </Text>
                {detail ? (
                  <Text
                    style={[
                      styles.stampDetail,
                      { color: stampInk, borderTopColor: stampInk },
                    ]}
                  >
                    {detail}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>

          <View style={styles.totals}>
            <View style={styles.totalsRow}>
              <Text style={styles.cellMuted}>Subtotal</Text>
              <Text style={styles.cellNumber}>
                {formatCurrency(invoice.subTotal)}
              </Text>
            </View>
            <View style={styles.totalsRowLast}>
              <Text style={styles.cellMuted}>
                Tax ({formatNumber(Number(invoice.taxRate))}%)
              </Text>
              <Text style={styles.cellNumber}>
                {formatCurrency(invoice.taxAmount)}
              </Text>
            </View>
            <View style={styles.grandRow}>
              <Text style={[styles.label, { paddingBottom: 2 }]}>
                {invoice.status === "paid" ? "Total paid" : "Total due"}
              </Text>
              <Text style={styles.grandValue}>
                {formatCurrency(invoice.total)}
              </Text>
            </View>
          </View>
        </View>

        {/* Payment details — informational only. Clentric never handles
            money between freelancer and client, so no payment button/link
            belongs here, only whatever instructions the freelancer typed
            in on this invoice. */}
        <View style={styles.closing} wrap={false}>
          {invoice.paymentDetails ? (
            <View style={styles.closingCol}>
              <Text style={styles.label}>Payment details</Text>
              <View style={styles.paymentBox}>
                <Text>{invoice.paymentDetails}</Text>
                <Text style={styles.reference}>
                  Please use {invoiceNumber} as the payment reference.
                </Text>
              </View>
            </View>
          ) : null}

          <View style={[styles.closingCol, { paddingRight: 0 }]}>
            <Text style={styles.label}>Questions</Text>
            <Text style={{ marginTop: 8 }}>
              Reply to <Text style={sansStrong}>{profile.email}</Text> and
              mention {invoiceNumber}.
            </Text>
          </View>
        </View>

        <View fixed style={styles.footer}>
          <Text style={styles.footerText}>
            {invoiceNumber} · {issuerName}
          </Text>
          {showBranding ? (
            <Text style={styles.footerText}>Powered by Clentric</Text>
          ) : null}
        </View>
      </Page>
    </Document>
  );
}
