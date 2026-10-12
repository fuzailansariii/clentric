import { describe, expect, it } from "vitest";
import { editableProjectsSchema, projectSchema } from "./schema";

const base = {
  title: "Website",
  clientId: "6f1c2b9e-1d2a-4c3b-9e8f-0a1b2c3d4e5f",
  budget: "500",
  status: "not_started" as const,
};

describe("project pricing", () => {
  it("defaults a new project to fixed", () => {
    expect(projectSchema.parse(base).pricing).toBe("fixed");
  });

  it("stores an empty hourly estimate as 0 (no estimate)", () => {
    const parsed = projectSchema.parse({
      ...base,
      pricing: "hourly",
      budget: "",
    });
    expect(parsed.budget).toBe("0");
  });

  it("never fills in pricing on an edit that doesn't send it", () => {
    const parsed = editableProjectsSchema.parse({ status: "in_progress" });
    expect(parsed).not.toHaveProperty("pricing");
  });

  it("still rejects a malformed amount", () => {
    expect(projectSchema.safeParse({ ...base, budget: "12.345" }).success).toBe(
      false,
    );
  });
});

describe("fixed price needs an amount", () => {
  it("refuses a fixed-price project with no price", () => {
    const parsed = projectSchema.safeParse({ ...base, budget: "" });
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0].path).toEqual(["budget"]);
  });

  it("refuses a fixed price of 0", () => {
    expect(projectSchema.safeParse({ ...base, budget: "0" }).success).toBe(
      false,
    );
  });

  it("refuses clearing the price while editing a fixed-price project", () => {
    const parsed = editableProjectsSchema.safeParse({
      pricing: "fixed",
      budget: "",
    });
    expect(parsed.success).toBe(false);
  });

  it("lets an hourly project keep no estimate on edit", () => {
    expect(
      editableProjectsSchema.safeParse({ pricing: "hourly", budget: "" })
        .success,
    ).toBe(true);
  });
});
