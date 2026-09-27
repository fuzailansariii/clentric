"use client";

import { useCallback } from "react";
import { usePathname } from "next/navigation";

/**
 * Returns a check for "is this link the page I'm already on?".
 *
 * Navigating to the current URL makes Next.js refetch the page and flash its
 * loading state, so links use this to skip that click. Only an exact path
 * with no query string counts: from /invoices?page=3 a link to /invoices
 * still navigates, back to the plain list.
 *
 * The query string is read at call time (inside a click handler) rather than
 * through useSearchParams, which would need a Suspense boundary.
 */
export function useIsCurrentPage() {
  const pathname = usePathname();

  return useCallback(
    (href: string) => pathname === href && !window.location.search,
    [pathname],
  );
}
