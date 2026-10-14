import { describe, expect, it } from "vitest";
import {
  boardProject,
  type BoardMilestone,
  type BoardProjectInput,
} from "./project-progress";

const ms = (over: Partial<BoardMilestone> = {}): BoardMilestone => ({
  id: Math.random().toString(36).slice(2),
  title: "Stage",
  done: false,
  dueDate: null,
  daysUntilDue: null,
  amount: 1000,
  invoiced: false,
  ...over,
});

const base = (over: Partial<BoardProjectInput> = {}): BoardProjectInput => ({
  status: "in_progress",
  pricing: "fixed",
  billing: "per_milestone",
  budget: 3000,
  billed: 0,
  daysUntilDeadline: null,
  milestones: [],
  ...over,
});

describe("boardProject", () => {
  it("offers the first finished, unbilled stage", () => {
    const b = boardProject(
      base({
        milestones: [
          ms({ title: "Discovery", done: true, invoiced: true }),
          ms({ id: "m2", title: "Design", done: true, amount: 1500 }),
          ms({ title: "Build" }),
        ],
      }),
    );
    expect(b.label).toBe("Ready to invoice");
    expect(b.ready).toEqual({
      kind: "stage",
      milestoneId: "m2",
      stage: 2,
      title: "Design",
      amount: 1500,
    });
    expect(b.segments).toEqual(["done", "ready", "todo"]);
    expect(b.next?.title).toBe("Build");
  });

  it("never offers a stage without an amount", () => {
    const b = boardProject(
      base({ milestones: [ms({ done: true, amount: null })] }),
    );
    expect(b.ready).toBeNull();
    expect(b.segments).toEqual(["done"]);
  });

  it("bills the remainder at the end for 'one invoice at the end'", () => {
    const b = boardProject(
      base({
        billing: "end",
        billed: 900,
        milestones: [ms({ done: true }), ms({ done: true })],
      }),
    );
    expect(b.ready).toEqual({ kind: "remaining", amount: 2100 });
  });

  it("is due soon when the next milestone is within a week or late", () => {
    expect(
      boardProject(base({ milestones: [ms({ daysUntilDue: 3 })] })).label,
    ).toBe("Due soon");
    expect(
      boardProject(base({ milestones: [ms({ daysUntilDue: -2 })] })).label,
    ).toBe("Due soon");
    expect(
      boardProject(base({ milestones: [ms({ daysUntilDue: 20 })] })).label,
    ).toBe("On track");
  });

  it("keeps completed, on hold and not started as they are", () => {
    expect(
      boardProject(
        base({ status: "completed", milestones: [ms({ done: true })] }),
      ).label,
    ).toBe("Completed");
    expect(boardProject(base({ status: "on_hold" })).label).toBe("On hold");
    expect(boardProject(base({ status: "not_started" })).label).toBe(
      "Not started",
    );
  });

  it("labels a stage ready only while in progress, but still offers it", () => {
    const b = boardProject(
      base({ status: "on_hold", milestones: [ms({ done: true, amount: 500 })] }),
    );
    expect(b.label).toBe("On hold");
    expect(b.ready?.kind).toBe("stage");
  });
});
