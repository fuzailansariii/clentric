import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatCurrency, formatNumber } from "@/lib/format-currency";
import { formatDate } from "@/lib/format-date";
import { formatInvoiceNumber } from "@/lib/format-invoice-number";
import { invoiceStatusConfig } from "./invoice-status-config";
import type { InvoicePdfData } from "./queries";

// @react-pdf/renderer is its own renderer, not the DOM — no Tailwind, no
// className, no CSS grid, just StyleSheet.create() and a flexbox subset.
// None of the web app's components or classes carry over here.
//
// Colors are copied by hand from app/globals.css's :root tokens (light
// theme only — a PDF has no dark mode) so the document reads as the same
// product as the web UI, not a second, separately-invented look.
const colors = {
  ink: "#111111",
  inkSoft: "#6b6b6b",
  inkFaint: "#9a9a95",
  border: "#e4e2db",
  paper: "#f6f5f1",
  primary: "#3454d1",
  success: "#2f8f5b",
  warning: "#b8741e",
  danger: "#c0432c",
  neutral: "#6b6b6b",
};

// Same status -> tone mapping invoiceStatusConfig already uses for the web
// badge (variant), just resolved to a real color instead of a Tailwind
// class, since react-pdf can't read one.
const variantColor: Record<string, string> = {
  info: colors.primary,
  success: colors.success,
  warning: colors.warning,
  danger: colors.danger,
  neutral: colors.neutral,
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    color: colors.ink,
    fontFamily: "Helvetica",
  },
  row: { flexDirection: "row" },
  spaceBetween: { flexDirection: "row", justifyContent: "space-between" },
  label: {
    fontSize: 8,
    color: colors.inkFaint,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 3,
  },
  value: { fontSize: 10, color: colors.ink },
  valueMuted: { fontSize: 9, color: colors.inkSoft },
  hr: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginVertical: 16,
  },

  // Header
  headerTitle: { fontSize: 20, fontFamily: "Helvetica-Bold" },
  headerNumber: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginTop: 2,
  },
  statusBadge: {
    alignSelf: "flex-end",
    borderRadius: 3,
    paddingVertical: 3,
    paddingHorizontal: 8,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    marginTop: 6,
  },

  // From / Bill To
  partyBlock: { flex: 1 },
  partyName: { fontSize: 10, fontFamily: "Helvetica-Bold", marginBottom: 2 },

  // Line items table
  table: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 8,
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: colors.paper,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  colDescription: { flex: 1 },
  colQty: { width: 50, textAlign: "right" },
  colRate: { width: 70, textAlign: "right" },
  colAmount: { width: 80, textAlign: "right" },
  tableHeaderText: {
    fontSize: 8,
    color: colors.inkFaint,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  // Totals
  totalsBlock: { width: 200, marginLeft: "auto", marginTop: 16 },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  totalsRowFinal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 6,
    marginTop: 3,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalsLabel: { fontSize: 9, color: colors.inkSoft },
  totalsValue: { fontSize: 9, color: colors.ink },
  totalsValueFinal: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: colors.primary,
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 8,
    color: colors.inkFaint,
  },
});

/**
 * Pure presentation — every value comes from props, nothing is fetched or
 * recomputed here. Money fields are the decimal strings the server already
 * computed and stored (invoices/actions.ts); this component only formats
 * them for display, it never adds, multiplies, or otherwise recalculates
 * a total. `data.invoice.status` is already the *display* status
 * (getDisplayStatus() is applied once, in getInvoiceForPdf() — see
 * queries.ts) — this never reads a raw `sent`-that's-actually-overdue.
 */
export function InvoicePdfDocument({
  data,
  showBranding = true,
}: {
  data: InvoicePdfData;
  /** Pro/Agency plans drop the "Powered by Clentric" footer. A prop, not a
   * plan lookup in here — this component stays pure; the caller decides. */
  showBranding?: boolean;
}) {
  const { invoice, items, profile } = data;
  const statusInfo = invoiceStatusConfig[invoice.status];
  const badgeColor = variantColor[statusInfo.variant] ?? colors.neutral;

  return (
    <Document
      title={`Invoice ${formatInvoiceNumber(invoice.invoiceNumber)}`}
      author={profile.name ?? profile.email}
    >
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.spaceBetween}>
          <View>
            <Text style={styles.headerTitle}>INVOICE</Text>
            <Text style={styles.headerNumber}>
              {formatInvoiceNumber(invoice.invoiceNumber)}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.label}>Issued</Text>
            <Text style={styles.value}>{formatDate(invoice.issueDate)}</Text>
            <View style={{ marginTop: 6 }} />
            <Text style={styles.label}>Due</Text>
            <Text style={styles.value}>{formatDate(invoice.dueDate)}</Text>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: `${badgeColor}20`,
                  color: badgeColor,
                },
              ]}
            >
              <Text>{statusInfo.label.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        <View style={styles.hr} />

        {/* From / Bill To */}
        <View style={styles.row}>
          <View style={styles.partyBlock}>
            <Text style={styles.label}>From</Text>
            <Text style={styles.partyName}>
              {profile.name ?? profile.email}
            </Text>
            {profile.profession && (
              <Text style={styles.valueMuted}>{profile.profession}</Text>
            )}
            <Text style={styles.valueMuted}>{profile.email}</Text>
          </View>
          <View style={styles.partyBlock}>
            <Text style={styles.label}>Bill To</Text>
            <Text style={styles.partyName}>{invoice.clientName}</Text>
            {invoice.clientCompany && (
              <Text style={styles.valueMuted}>{invoice.clientCompany}</Text>
            )}
            {invoice.clientEmail && (
              <Text style={styles.valueMuted}>{invoice.clientEmail}</Text>
            )}
            {invoice.clientCountry && (
              <Text style={styles.valueMuted}>{invoice.clientCountry}</Text>
            )}
          </View>
        </View>

        {/* Line items */}
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.colDescription, styles.tableHeaderText]}>
              Description
            </Text>
            <Text style={[styles.colQty, styles.tableHeaderText]}>Qty</Text>
            <Text style={[styles.colRate, styles.tableHeaderText]}>Rate</Text>
            <Text style={[styles.colAmount, styles.tableHeaderText]}>
              Amount
            </Text>
          </View>

          {items.map((item) => (
            <View key={item.id} style={styles.tableRow}>
              <Text style={[styles.colDescription, styles.value]}>
                {item.description}
              </Text>
              <Text style={[styles.colQty, styles.value]}>
                {formatNumber(Number(item.quantity))}
              </Text>
              <Text style={[styles.colRate, styles.value]}>
                {formatCurrency(item.rate)}
              </Text>
              <Text
                style={[styles.colAmount, styles.value, { fontWeight: 700 }]}
              >
                {formatCurrency(item.amount)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsBlock}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Subtotal</Text>
            <Text style={styles.totalsValue}>
              {formatCurrency(invoice.subTotal)}
            </Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>
              Tax ({formatNumber(Number(invoice.taxRate))}%)
            </Text>
            <Text style={styles.totalsValue}>
              {formatCurrency(invoice.taxAmount)}
            </Text>
          </View>
          <View style={styles.totalsRowFinal}>
            <Text style={[styles.totalsLabel, { fontFamily: "Helvetica-Bold" }]}>
              Total
            </Text>
            <Text style={styles.totalsValueFinal}>
              {formatCurrency(invoice.total)}
            </Text>
          </View>
        </View>

        {/* Payment details — informational only. Clentric never handles
            money between freelancer and client, so no payment button/link
            belongs here, only whatever instructions the freelancer typed
            in on this invoice. */}
        {invoice.paymentDetails && (
          <View style={{ marginTop: 24 }}>
            <Text style={styles.label}>Payment Details</Text>
            <Text style={styles.value}>{invoice.paymentDetails}</Text>
          </View>
        )}

        {showBranding && (
          <Text style={styles.footer}>Powered by Clentric</Text>
        )}
      </Page>
    </Document>
  );
}
