import { InvoiceFormInput } from "@/app/(dashboard)/invoices/schema";

// Fields are optional because a z.coerce schema with .default() leaves them
// optional on the form's input type, and a half-filled row is exactly what
// this gets called with while someone is still typing. The body already
// treats a missing value as 0.
export function calculateTotals(
  lineItems: { quantity?: unknown; rate?: unknown }[],
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
