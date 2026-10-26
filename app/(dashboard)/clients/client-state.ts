import type { StatusTone } from "@/components/ui/status-badge";

/**
 * A client's state is worked out from their invoices, projects and proposals,
 * never set by hand; only archiving is a choice. Order = list order, and the
 * first matching rule wins (mirrored by `clientStateSql` in queries.ts).
 */
export const CLIENT_STATES = [
  "overdue",
  "in_progress",
  "proposal_out",
  "owes",
  "new",
  "quiet",
  "archived",
] as const;

export type ClientState = (typeof CLIENT_STATES)[number];

export const clientStateConfig: Record<
  ClientState,
  { label: string; tone: StatusTone }
> = {
  overdue: { label: "Overdue", tone: "danger" },
  in_progress: { label: "In progress", tone: "success" },
  proposal_out: { label: "Proposal out", tone: "info" },
  owes: { label: "Owes you", tone: "warning" },
  new: { label: "New", tone: "violet" },
  quiet: { label: "Quiet", tone: "neutral" },
  archived: { label: "Archived", tone: "outline" },
};

/** What the state is based on, per client. */
export type ClientFacts = {
  overdueInvoices: number;
  daysLate: number;
  openProjects: number;
  proposalsOut: number;
  unpaidInvoices: number;
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** The one line under a client that says why they're in their state. */
export function clientActivity(state: ClientState, facts: ClientFacts): string {
  if (facts.overdueInvoices > 0) {
    const late = plural(facts.daysLate, "day");
    return facts.overdueInvoices === 1
      ? `1 invoice ${late} late`
      : `${facts.overdueInvoices} invoices, up to ${late} late`;
  }
  if (facts.openProjects > 0) return plural(facts.openProjects, "open project");
  if (facts.proposalsOut > 0) {
    return `${plural(facts.proposalsOut, "proposal")} awaiting reply`;
  }
  if (facts.unpaidInvoices > 0) {
    return `${plural(facts.unpaidInvoices, "invoice")} unpaid`;
  }
  return state === "new" ? "Nothing sent yet" : "Nothing open";
}
