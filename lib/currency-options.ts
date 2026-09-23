/**
 * The currencies this product will bill in.
 *
 * NOT rendered anywhere today - everything is created as USD on purpose, and
 * the pickers were removed. Kept because proposals, invoices and projects all
 * carry a currency column already, so switching this on later is a UI change
 * rather than a migration. CURRENCY_CODES still guards the Zod schemas so a
 * hand-crafted request cannot store something arbitrary.
 *
 * Shared by the proposal and invoice builders so the two can never offer
 * different lists. The symbol is part of the label string rather than a
 * separate node: Radix's SelectValue carries only the selected item's text
 * into the trigger and discards elements, so a prefix rendered as its own
 * span shows in the open dropdown and then vanishes once the menu closes.
 */
export const CURRENCY_OPTIONS = [
  { value: "USD", label: "$  USD - US Dollar" },
  { value: "EUR", label: "€  EUR - Euro" },
  { value: "GBP", label: "£  GBP - British Pound" },
  { value: "CAD", label: "C$  CAD - Canadian Dollar" },
  { value: "AUD", label: "A$  AUD - Australian Dollar" },
  { value: "INR", label: "₹  INR - Indian Rupee" },
] as const;

/** Widened to string[] so `.includes()` accepts arbitrary user input. */
export const CURRENCY_CODES: string[] = CURRENCY_OPTIONS.map((o) => o.value);
