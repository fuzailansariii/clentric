import { describe, expect, it } from "vitest";
import {
  escapeHtml,
  invoiceEmail,
  proposalEmail,
  reminderEmail,
} from "./templates";

const base = {
  senderName: "Alex <Studio>",
  clientName: "Sam & Co",
  invoiceNumber: "INV-007",
  amount: "$1,200.00",
  dueDate: "Oct 10, 2026",
};

describe("email templates", () => {
  it("escapes user-typed values in the HTML", () => {
    const email = invoiceEmail(base);
    expect(email.html).toContain("Alex &lt;Studio&gt;");
    expect(email.html).toContain("Hi Sam &amp; Co,");
    expect(email.html).not.toContain("<Studio>");
    expect(email.text).toContain("Hi Sam & Co,");
    expect(email.subject).toBe("Invoice INV-007 from Alex <Studio>");
  });

  it("words a reminder by whether it is overdue", () => {
    expect(reminderEmail({ ...base, daysOverdue: 0 }).subject).toBe(
      "Reminder: invoice INV-007 from Alex <Studio>",
    );
    const overdue = reminderEmail({ ...base, daysOverdue: 3 });
    expect(overdue.subject).toBe("Overdue: invoice INV-007 from Alex <Studio>");
    expect(overdue.text).toContain("was due on Oct 10, 2026 (3 days ago)");
  });

  it("links to the proposal and skips a missing expiry", () => {
    const email = proposalEmail({
      ...base,
      title: 'Site "redesign"',
      expiresOn: null,
      url: "https://clentric.app/p/abc",
    });
    expect(email.html).toContain('href="https://clentric.app/p/abc"');
    expect(email.html).toContain("Site &quot;redesign&quot;");
    expect(email.text).not.toContain("Valid until");
  });

  it("shows an https logo with an escaped alt and skips anything else", () => {
    const withLogo = invoiceEmail({
      ...base,
      logo: { src: "https://ik.imagekit.io/x/logo.png?tr=f-png", alt: 'A"B' },
    });
    expect(withLogo.html).toContain(
      'src="https://ik.imagekit.io/x/logo.png?tr=f-png" alt="A&quot;B"',
    );

    const unsafe = invoiceEmail({
      ...base,
      logo: { src: "javascript:alert(1)", alt: "x" },
    });
    expect(unsafe.html).not.toContain("<img");
    expect(invoiceEmail(base).html).not.toContain("<img");
  });

  it("escapes quotes for attributes", () => {
    expect(escapeHtml(`"'<>&`)).toBe("&quot;&#39;&lt;&gt;&amp;");
  });
});
