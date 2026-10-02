import { describe, expect, it } from "vitest";
import type { ActivityItem } from "@/app/(dashboard)/dashboard/queries";
import { ACTIVITY_ACTIONS, type ActivityAction } from "./activity-actions";
import { describeActivity } from "./activity-display";

function item(action: ActivityAction, overrides: Partial<ActivityItem> = {}) {
  return {
    id: "log-1",
    action,
    entityId: "entity-1",
    metadata: null,
    createdAt: new Date(2026, 9, 2),
    clientName: "Acme Studio",
    invoiceNumber: 13,
    numberPrefix: "INV-",
    invoiceTotal: "2400.00",
    invoiceCurrency: "USD",
    proposalTitle: "Website redesign",
    projectId: "project-1",
    projectTitle: "Fieldnote",
    milestoneTitle: "Wireframes",
    ...overrides,
  } satisfies ActivityItem;
}

const sentence = (
  action: ActivityAction,
  overrides?: Partial<ActivityItem>,
) => {
  const { actor, rest } = describeActivity(item(action, overrides));
  return `${actor} ${rest}`;
};

describe("describeActivity", () => {
  it("describes every action", () => {
    for (const action of Object.keys(ACTIVITY_ACTIONS) as ActivityAction[]) {
      const row = describeActivity(item(action));
      expect(row.actor).not.toBe("");
      expect(row.rest).not.toBe("");
      expect(row.href).toMatch(/^\/(clients|invoices|proposals|projects)\//);
    }
  });

  it("leads with the client for client events", () => {
    expect(sentence("proposal.accepted")).toBe(
      "Acme Studio accepted “Website redesign”",
    );
    expect(sentence("invoice.payment_claimed")).toBe(
      "Acme Studio says they paid INV-013",
    );
  });

  it("leads with You for the user's own actions", () => {
    expect(sentence("invoice.sent")).toBe("You sent INV-013 to Acme Studio");
  });

  it("shows the amount on paid invoices", () => {
    expect(sentence("invoice.paid")).toBe("INV-013 marked paid · $2,400.00");
    expect(sentence("invoice.paid", { invoiceTotal: null })).toBe(
      "INV-013 marked paid",
    );
  });

  it("links each entity to its page", () => {
    expect(describeActivity(item("client.created")).href).toBe(
      "/clients/entity-1",
    );
    expect(describeActivity(item("invoice.sent")).href).toBe(
      "/invoices/entity-1",
    );
    expect(describeActivity(item("proposal.viewed")).href).toBe(
      "/proposals/entity-1",
    );
    expect(describeActivity(item("project.created")).href).toBe(
      "/projects/entity-1",
    );
    // A milestone opens its project.
    expect(describeActivity(item("milestone.completed")).href).toBe(
      "/projects/project-1",
    );
  });

  it("falls back when a name is missing", () => {
    expect(sentence("proposal.viewed", { clientName: null })).toBe(
      "A client viewed “Website redesign”",
    );
  });
});
