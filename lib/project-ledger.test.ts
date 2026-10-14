import { describe, expect, it } from "vitest";
import {
  invoiceProjectBalance,
  projectLedger,
  sumProjectInvoices,
} from "./project-ledger";

describe("projectLedger", () => {
  it("is within budget when billed plus this invoice fits", () => {
    const l = projectLedger({ budget: "500.00", billed: "300.00", thisInvoice: 150 });
    expect(l).toMatchObject({ budget: 500, total: 450, remaining: 50, isOver: false, percent: 90 });
  });

  it("is exactly on budget without being over", () => {
    const l = projectLedger({ budget: "500.00", billed: "250.00", thisInvoice: 250 });
    expect(l.remaining).toBe(0);
    expect(l.isOver).toBe(false);
  });

  it("flags going over and reports by how much", () => {
    const l = projectLedger({ budget: "500.00", billed: "300.00", thisInvoice: 250 });
    expect(l.isOver).toBe(true);
    expect(l.remaining).toBe(-50);
    expect(l.percent).toBe(110);
  });

  it("catches a deposit billed again: 30% deposit + full price", () => {
    const l = projectLedger({ budget: "500.00", billed: "150.00", thisInvoice: 500 });
    expect(l.isOver).toBe(true);
    expect(l.remaining).toBe(-150);
  });

  it("treats a 0 budget as no budget", () => {
    const l = projectLedger({ budget: "0.00", billed: "900.00", thisInvoice: 100 });
    expect(l).toMatchObject({ budget: null, remaining: null, percent: null, isOver: false, total: 1000 });
  });

  it("adds decimal strings without float drift", () => {
    const l = projectLedger({ budget: "0.30", billed: "0.10", thisInvoice: "0.20" });
    expect(l.total).toBe(0.3);
    expect(l.remaining).toBe(0);
    expect(l.isOver).toBe(false);
  });

  it("works out outstanding from billed and paid", () => {
    const l = projectLedger({ budget: 1000, billed: "700.00", paid: "250.00" });
    expect(l.outstanding).toBe(450);
  });
});

describe("sumProjectInvoices", () => {
  it("counts sent, paid and overdue, keeps drafts apart", () => {
    const sums = sumProjectInvoices([
      { status: "sent", total: "100.00" },
      { status: "paid", total: "150.50" },
      { status: "overdue", total: "49.50" },
      { status: "draft", total: "80.00" },
    ]);
    expect(sums).toEqual({ billed: 300, paid: 150.5, drafts: 80 });
  });
});

describe("invoiceProjectBalance", () => {
  it("works out what's left after this invoice", () => {
    expect(
      invoiceProjectBalance({ pricing: "fixed", budget: "1000.00", paidBefore: "100.00", thisInvoice: "300.00" }),
    ).toEqual({ projectTotal: 1000, paidBefore: 100, thisInvoice: 300, remaining: 600 });
  });

  it("never shows a negative remaining", () => {
    const b = invoiceProjectBalance({ pricing: "fixed", budget: "1000", paidBefore: "1000", thisInvoice: "200" });
    expect(b?.remaining).toBe(0);
  });

  it("is hidden for hourly projects and projects without a price", () => {
    expect(invoiceProjectBalance({ pricing: "hourly", budget: "1500", paidBefore: 0, thisInvoice: 100 })).toBeNull();
    expect(invoiceProjectBalance({ pricing: "fixed", budget: "0.00", paidBefore: 0, thisInvoice: 100 })).toBeNull();
  });
});
