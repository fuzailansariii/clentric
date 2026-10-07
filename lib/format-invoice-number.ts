/**
 * "INV-015". The prefix is the one stored on the invoice (invoices.number_prefix),
 * not the user's current setting, so renaming the prefix never renames old
 * invoices.
 */
export function formatInvoiceNumber(invoiceNumber: number, prefix: string) {
  return `${prefix}${String(invoiceNumber).padStart(3, "0")}`;
}
