/** A project's milestones as the board reads them. Dates are YYYY-MM-DD. */
export type BoardMilestone = {
  id: string;
  title: string;
  done: boolean;
  dueDate: string | null;
  /** Whole days until dueDate (negative once past); null without a date. */
  daysUntilDue: number | null;
  amount: number | null;
  /** Billed on an invoice that hasn't been deleted. */
  invoiced: boolean;
};

export type BoardProjectInput = {
  status: "not_started" | "in_progress" | "on_hold" | "completed";
  pricing: "fixed" | "hourly";
  billing: "per_milestone" | "end";
  budget: number;
  billed: number;
  daysUntilDeadline: number | null;
  milestones: BoardMilestone[];
};

export type BoardTone = "info" | "warning" | "success" | "neutral";
export type SegmentState = "done" | "ready" | "todo";

export type BoardProject = {
  label: string;
  tone: BoardTone;
  segments: SegmentState[];
  done: number;
  total: number;
  /** The first unfinished milestone, or null when there is none. */
  next: { title: string; dueDate: string | null } | null;
  /** What can be invoiced right now, if anything. */
  ready:
    | {
        kind: "stage";
        milestoneId: string;
        stage: number;
        title: string;
        amount: number;
      }
    | { kind: "remaining"; amount: number }
    | null;
};

/** "Due soon" when the next milestone or the deadline is this close (or past). */
export const DUE_SOON_DAYS = 7;

function isReady(m: BoardMilestone, billing: BoardProjectInput["billing"]) {
  return (
    billing === "per_milestone" && m.done && !m.invoiced && (m.amount ?? 0) > 0
  );
}

export function boardProject(p: BoardProjectInput): BoardProject {
  const segments = p.milestones.map<SegmentState>((m) =>
    isReady(m, p.billing) ? "ready" : m.done ? "done" : "todo",
  );
  const done = p.milestones.filter((m) => m.done).length;
  const nextMs = p.milestones.find((m) => !m.done) ?? null;
  const next = nextMs ? { title: nextMs.title, dueDate: nextMs.dueDate } : null;

  let ready: BoardProject["ready"] = null;
  if (p.status !== "completed") {
    const index = p.milestones.findIndex((m) => isReady(m, p.billing));
    if (index >= 0) {
      const m = p.milestones[index];
      ready = {
        kind: "stage",
        milestoneId: m.id,
        stage: index + 1,
        title: m.title,
        amount: m.amount ?? 0,
      };
    } else if (
      p.billing === "end" &&
      p.pricing === "fixed" &&
      p.milestones.length > 0 &&
      done === p.milestones.length &&
      p.budget > p.billed
    ) {
      ready = {
        kind: "remaining",
        amount: Math.round((p.budget - p.billed) * 100) / 100,
      };
    }
  }

  const base = { segments, done, total: p.milestones.length, next, ready };
  if (p.status === "completed")
    return { ...base, label: "Completed", tone: "neutral" };
  if (p.status === "on_hold")
    return { ...base, label: "On hold", tone: "neutral" };
  if (p.status === "not_started")
    return { ...base, label: "Not started", tone: "neutral" };
  if (ready) return { ...base, label: "Ready to invoice", tone: "info" };

  const soon = (days: number | null) => days !== null && days <= DUE_SOON_DAYS;
  if (soon(nextMs?.daysUntilDue ?? null) || soon(p.daysUntilDeadline)) {
    return { ...base, label: "Due soon", tone: "warning" };
  }
  return { ...base, label: "On track", tone: "success" };
}
