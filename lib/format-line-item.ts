import { formatCurrency, formatNumber } from "@/lib/format-currency";
import type { InvoiceItemUnit } from "@/src/db/schema/invoice-items";

type UnitCopy = {
  /** Label in the line-item unit picker. */
  option: string;
  /** Label on the quantity input while this unit is selected. */
  quantityLabel: string;
  /** Short unit after a quantity as [singular, plural]; null for plain items. */
  short: [string, string] | null;
  /** Suffix after a rate ("/hr"); undefined for plain items. */
  rateSuffix: string | undefined;
};

/** One source for every place a line item's unit is shown — the builder,
 * the invoice detail page and the PDF. */
export const lineItemUnits: Record<InvoiceItemUnit, UnitCopy> = {
  item: {
    option: "Item",
    quantityLabel: "Quantity",
    short: null,
    rateSuffix: undefined,
  },
  hour: {
    option: "Hours",
    quantityLabel: "Hours",
    short: ["hr", "hrs"],
    rateSuffix: "/hr",
  },
  day: {
    option: "Days",
    quantityLabel: "Days",
    short: ["day", "days"],
    rateSuffix: "/day",
  },
};

export const lineItemUnitOptions = (
  Object.keys(lineItemUnits) as InvoiceItemUnit[]
).map((unit) => ({ value: unit, label: lineItemUnits[unit].option }));

const trimmedNumber = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

/** "12.5 hrs", "1 day". Plain items keep the existing "2.00". */
export function formatLineItemQuantity(
  quantity: string | number,
  unit: InvoiceItemUnit,
): string {
  const value = Number(quantity);
  const short = lineItemUnits[unit].short;
  if (!short) return formatNumber(value);
  return `${trimmedNumber.format(value)} ${value === 1 ? short[0] : short[1]}`;
}

/** "$85.00/hr". Plain items stay "$85.00". */
export function formatLineItemRate(
  rate: string,
  unit: InvoiceItemUnit,
): string {
  return `${formatCurrency(rate)}${lineItemUnits[unit].rateSuffix ?? ""}`;
}
