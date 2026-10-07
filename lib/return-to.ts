// A fixed list, so a crafted ?returnTo= link can't redirect anywhere else.
const RETURN_TO_PATHS = ["/dashboard"] as const;

export type ReturnTo = (typeof RETURN_TO_PATHS)[number];

/** The value when it's an allowed in-app path, otherwise null. */
export function getSafeReturnTo(value: unknown): ReturnTo | null {
  return RETURN_TO_PATHS.find((path) => path === value) ?? null;
}
