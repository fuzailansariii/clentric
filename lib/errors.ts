import * as Sentry from "@sentry/nextjs";
import { scrubError } from "./scrub-error";

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function logError(context: string, error: unknown) {
  // Database errors carry customer data (emails, names, notes); log a scrubbed copy.
  const safe = scrubError(error);
  console.error(`[${context}]`, safe);
  // AppErrors are expected, or wrap a failure already logged where it happened.
  if (error instanceof AppError) return;
  Sentry.captureException(
    safe instanceof Error ? safe : new Error(`[${context}] ${String(safe)}`),
    { tags: { context } },
  );
}

function hasCode(error: unknown, code: string): boolean {
  return (
    !!error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === code
  );
}

/**
 * Postgres unique_violation (23505).
 *
 * Drizzle wraps the driver's error in a DrizzleQueryError and puts the real
 * postgres error (the one carrying .code) on .cause, so both the error itself
 * and its cause need checking — the driver-level error postgres.js throws
 * directly only ever needs the first.
 */
export function isUniqueViolation(error: unknown): boolean {
  return (
    hasCode(error, "23505") ||
    (error instanceof Error && hasCode(error.cause, "23505"))
  );
}
