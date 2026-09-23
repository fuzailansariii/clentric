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
  console.error(`[${context}]`, error);
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
