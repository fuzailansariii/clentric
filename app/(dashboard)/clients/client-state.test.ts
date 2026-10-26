import { describe, expect, it } from "vitest";
import { clientActivity, type ClientFacts } from "./client-state";

const none: ClientFacts = {
  overdueInvoices: 0,
  daysLate: 0,
  openProjects: 0,
  proposalsOut: 0,
  unpaidInvoices: 0,
};

describe("clientActivity", () => {
  it("leads with overdue invoices and how late they are", () => {
    expect(
      clientActivity("overdue", {
        ...none,
        overdueInvoices: 1,
        daysLate: 5,
        openProjects: 2,
      }),
    ).toBe("1 invoice 5 days late");
    expect(
      clientActivity("overdue", { ...none, overdueInvoices: 2, daysLate: 1 }),
    ).toBe("2 invoices, up to 1 day late");
  });

  it("then open projects, proposals out and unpaid invoices", () => {
    expect(
      clientActivity("in_progress", {
        ...none,
        openProjects: 1,
        unpaidInvoices: 3,
      }),
    ).toBe("1 open project");
    expect(clientActivity("proposal_out", { ...none, proposalsOut: 2 })).toBe(
      "2 proposals awaiting reply",
    );
    expect(clientActivity("owes", { ...none, unpaidInvoices: 1 })).toBe(
      "1 invoice unpaid",
    );
  });

  it("tells a new client apart from a quiet one", () => {
    expect(clientActivity("new", none)).toBe("Nothing sent yet");
    expect(clientActivity("quiet", none)).toBe("Nothing open");
    expect(clientActivity("archived", none)).toBe("Nothing open");
  });
});
