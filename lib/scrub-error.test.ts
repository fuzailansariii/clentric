import { describe, expect, it } from "vitest";
import { DrizzleQueryError } from "drizzle-orm";
import { scrubError, scrubText } from "./scrub-error";

function postgresError() {
  return Object.assign(
    new Error('duplicate key value violates unique constraint "users_email_unique"'),
    { name: "PostgresError", code: "23505", detail: "Key (email)=(jane@acme.com) already exists." },
  );
}

describe("scrubError", () => {
  it("turns a Drizzle error into its Postgres cause, without the bound values", () => {
    const error = new DrizzleQueryError(
      'insert into "clients" ("name", "email") values ($1, $2)',
      ["Jane Doe", "jane@acme.com"],
      postgresError(),
    );
    const safe = scrubError(error) as Error & { code?: string };

    const logged = `${safe.message} ${safe.stack} ${JSON.stringify(safe)}`;
    expect(logged).not.toContain("jane@acme.com");
    expect(logged).not.toContain("Jane Doe");
    expect(safe.message).toContain("users_email_unique");
    expect(safe.code).toBe("23505");
  });

  it("drops a Postgres error's detail", () => {
    const safe = scrubError(postgresError()) as Error;
    expect(JSON.stringify(safe)).not.toContain("jane@acme.com");
    expect(safe.message).toContain("duplicate key");
  });

  it("leaves other errors and values untouched", () => {
    const plain = new Error("Resend is down");
    expect(scrubError(plain)).toBe(plain);
    expect(scrubError("RESEND_API_KEY is not set.")).toBe("RESEND_API_KEY is not set.");
  });
});

describe("scrubText", () => {
  it("cuts a params tail, including multi-line values", () => {
    expect(scrubText("Failed query: select 1\nparams: a@b.com,line one\nline two")).toBe(
      "Failed query: select 1",
    );
  });
});
