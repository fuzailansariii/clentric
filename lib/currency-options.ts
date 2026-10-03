/**
 * The currencies this product will bill in.
 *
 * USD only for now: the pickers were removed and the schemas reject any
 * other code, even from a hand-crafted request. Proposals, invoices and
 * projects already carry a currency column, so adding currencies later means
 * adding them here plus the pickers, not a migration.
 *
 * Shared by the proposal and invoice builders so the two can never offer
 * different lists. The symbol is part of the label string rather than a
 * separate node: Radix's SelectValue carries only the selected item's text
 * into the trigger and discards elements, so a prefix rendered as its own
 * span shows in the open dropdown and then vanishes once the menu closes.
 */
export const CURRENCY_OPTIONS = [
  { value: "USD", label: "$  USD - US Dollar" },
] as const;

/** Widened to string[] so `.includes()` accepts arbitrary user input. */
export const CURRENCY_CODES: string[] = CURRENCY_OPTIONS.map((o) => o.value);
