/** The invoice PDF layouts a freelancer can pick in Settings → Business. */
export const INVOICE_TEMPLATES = [
  {
    id: "classic",
    name: "Classic",
    description:
      "Blue band across the top, ledger-style table and a status stamp.",
  },
  {
    id: "modern",
    name: "Modern",
    description:
      "Monogram header, a bold amount-due box and a how-to-pay panel.",
  },
] as const;

export type InvoiceTemplate = (typeof INVOICE_TEMPLATES)[number]["id"];

export const INVOICE_TEMPLATE_IDS = INVOICE_TEMPLATES.map(
  (template) => template.id,
) as [InvoiceTemplate, ...InvoiceTemplate[]];
