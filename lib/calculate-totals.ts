import { InvoiceFormInput } from "@/app/(dashboard)/invoices/schema";

export function calculateTotals(
  lineItems: { quantity: unknown; rate: unknown }[],
  taxRateInput: unknown,
) {
  const subtotal = lineItems.reduce((sum, item) => {
    const quantity = Number(item.quantity ?? 0);
    const rate = Number(item.rate ?? 0);
    return sum + quantity * rate;
  }, 0);

  const taxRate = Number(taxRateInput ?? 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  return { subtotal, taxRate, taxAmount, total };
}

export function calculateInvoiceTotals(
  lineItems: InvoiceFormInput["lineItems"],
  taxRateInput: InvoiceFormInput["taxRate"],
) {
  return calculateTotals(lineItems, taxRateInput);
}
