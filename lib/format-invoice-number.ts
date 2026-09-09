export function formatInvoiceNumber(invoiceNumber: number) {
  return `INV-${String(invoiceNumber).padStart(3, "0")}`;
}
