const PARAMS = /\nparams:[\s\S]*/;

/** Removes a Drizzle "params: ..." tail: the query's bound values (emails, names, notes). */
export function scrubText(text: string): string {
  return text.replace(PARAMS, "");
}

/**
 * A copy of the error that is safe to log: Drizzle errors become their Postgres
 * cause, and Postgres `detail` (e.g. "Key (email)=(a@b.com)") is dropped.
 */
export function scrubError(error: unknown): unknown {
  if (!(error instanceof Error)) return error;

  const fromQuery = "params" in error;
  const source = fromQuery && error.cause instanceof Error ? error.cause : error;
  if (!fromQuery && !("detail" in source)) return error;

  const safe = new Error(scrubText(source.message));
  safe.name = source.name;
  safe.stack = scrubText(source.stack ?? "");
  if ("code" in source) Object.assign(safe, { code: source.code });
  return safe;
}
