const round2 = (n: number) => Math.round(n * 100) / 100;

/** A deposit's line is a share of the subtotal (before tax, like budgets); its
 *  total is the same share of the proposal total, and tax is the gap. */
export function depositAmounts(
  subtotal: number | string,
  total: number | string,
  percent: number | string,
) {
  const share = Number(percent) / 100;
  const subTotal = round2(Number(subtotal) * share);
  const depositTotal = round2(Number(total) * share);
  return {
    subTotal,
    taxAmount: round2(depositTotal - subTotal),
    total: depositTotal,
  };
}
