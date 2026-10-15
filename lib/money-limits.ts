// Money columns are decimal(12,2) and quantities decimal(10,2); these keep
// every line and total well inside them, so nothing reaches the DB and fails.
export const MAX_MONEY = 999_999_999.99;
export const MAX_QUANTITY = 1_000_000;

export const MAX_MONEY_LABEL = "$999,999,999.99";
export const NOT_A_NUMBER = "Enter a number";
export const QUANTITY_TOO_LARGE = "Quantity must be 1,000,000 or less";
export const RATE_TOO_LARGE = `Rate must be ${MAX_MONEY_LABEL} or less`;
export const LINE_TOO_LARGE = `This line comes to more than ${MAX_MONEY_LABEL}`;
export const TOTAL_TOO_LARGE = `The total can't be more than ${MAX_MONEY_LABEL}. Split it across more than one document.`;

/** True when quantity x rate stays within the money limit. */
export function lineWithinLimit(quantity: number, rate: number): boolean {
  return Math.round(quantity * rate * 100) / 100 <= MAX_MONEY;
}
