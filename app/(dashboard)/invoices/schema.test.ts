import { describe, expect, it } from "vitest";
import { invoiceSchema, updateInvoiceSchema } from "./schema";

const base = {
  issueDate: "2026-10-12",
  dueDate: "2026-10-19",
  taxRate: 0,
  lineItems: [{ description: "Logo", quantity: 1, rate: 300 }],
};
const clientId = "6f1c2b9e-1d2a-4c3b-9e8f-0a1b2c3d4e5f";

describe("invoice bill-to", () => {
  it("accepts a saved client", () => {
    expect(invoiceSchema.safeParse({ ...base, clientId }).success).toBe(true);
  });

  it("accepts a typed client with no saved one", () => {
    const parsed = invoiceSchema.safeParse({
      ...base,
      clientId: "",
      newClient: { name: "Acme", email: "" },
    });
    expect(parsed.success).toBe(true);
  });

  it("refuses an invoice with neither", () => {
    const parsed = invoiceSchema.safeParse({ ...base, clientId: "" });
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0].path).toEqual(["clientId"]);
  });

  it("refuses a typed client without a name", () => {
    const parsed = invoiceSchema.safeParse({ ...base, newClient: { name: " " } });
    expect(parsed.success).toBe(false);
  });

  it("keeps the project balance off unless asked", () => {
    expect(invoiceSchema.parse({ ...base, clientId }).showProjectBalance).toBe(false);
  });

  it("still needs a saved client when editing", () => {
    const parsed = updateInvoiceSchema.safeParse({
      ...base,
      invoiceId: clientId,
      clientId: "",
    });
    expect(parsed.success).toBe(false);
  });
});
