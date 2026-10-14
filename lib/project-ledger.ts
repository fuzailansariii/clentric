/** Statuses that count as billed against a project's budget. Drafts don't. */
export const BILLED_STATUSES = ["sent", "paid", "overdue"] as const;

export type ProjectLedger = {
  /** Null when the project has no budget (stored as 0). */
  budget: number | null;
  /** Sent, paid and overdue invoices, in their totals (tax included). */
  billed: number;
  paid: number;
  outstanding: number;
  /** Shown apart: neither counted nor ignored. */
  drafts: number;
  /** The invoice being written in the builder, 0 elsewhere. */
  thisInvoice: number;
  /** billed + thisInvoice. */
  total: number;
  /** Budget minus total; negative when over. Null without a budget. */
  remaining: number | null;
  isOver: boolean;
  /** Share of the budget used, 0-100+. Null without a budget. */
  percent: number | null;
};

type Money = string | number | null | undefined;

// Whole cents, so sums of decimal strings never drift.
const cents = (value: Money) => Math.round(Number(value ?? 0) * 100) || 0;

/**
 * Where a project stands against its budget. Compares invoice totals, the
 * same basis as proposal budgets and deposits. Assumes one currency (USD only).
 */
export function projectLedger(input: {
  budget: Money;
  billed: Money;
  paid?: Money;
  drafts?: Money;
  thisInvoice?: Money;
}): ProjectLedger {
  const budget = cents(input.budget);
  const billed = cents(input.billed);
  const paid = cents(input.paid);
  const thisInvoice = Math.max(0, cents(input.thisInvoice));
  const total = billed + thisInvoice;
  const hasBudget = budget > 0;

  return {
    budget: hasBudget ? budget / 100 : null,
    billed: billed / 100,
    paid: paid / 100,
    outstanding: Math.max(0, billed - paid) / 100,
    drafts: cents(input.drafts) / 100,
    thisInvoice: thisInvoice / 100,
    total: total / 100,
    remaining: hasBudget ? (budget - total) / 100 : null,
    isOver: hasBudget && total > budget,
    percent: hasBudget ? Math.round((total / budget) * 100) : null,
  };
}

/** Folds a project's invoice rows into ledger inputs. */
export function sumProjectInvoices(
  rows: readonly { status: string; total: string }[],
) {
  let billed = 0;
  let paid = 0;
  let drafts = 0;
  for (const row of rows) {
    const amount = cents(row.total);
    if (row.status === "draft") drafts += amount;
    else if ((BILLED_STATUSES as readonly string[]).includes(row.status)) {
      billed += amount;
      if (row.status === "paid") paid += amount;
    }
  }
  return { billed: billed / 100, paid: paid / 100, drafts: drafts / 100 };
}

export type InvoiceProjectBalance = {
  projectTotal: number;
  /** Paid invoices on the project created before this one. */
  paidBefore: number;
  thisInvoice: number;
  /** Never below 0. */
  remaining: number;
};

/** The balance box on an invoice. Fixed-price projects with a price only. */
export function invoiceProjectBalance(input: {
  pricing: "fixed" | "hourly";
  budget: Money;
  paidBefore: Money;
  thisInvoice: Money;
}): InvoiceProjectBalance | null {
  const total = cents(input.budget);
  if (input.pricing !== "fixed" || total <= 0) return null;
  const paidBefore = cents(input.paidBefore);
  const thisInvoice = cents(input.thisInvoice);
  return {
    projectTotal: total / 100,
    paidBefore: paidBefore / 100,
    thisInvoice: thisInvoice / 100,
    remaining: Math.max(0, total - paidBefore - thisInvoice) / 100,
  };
}

/** The balance box's rows, in print order; the last one is the emphasised total. */
export function balanceRows(balance: InvoiceProjectBalance): [string, number][] {
  return [
    ["Project total", balance.projectTotal],
    ["Paid before this invoice", balance.paidBefore],
    ["This invoice", balance.thisInvoice],
    ["Remaining after this invoice", balance.remaining],
  ];
}
