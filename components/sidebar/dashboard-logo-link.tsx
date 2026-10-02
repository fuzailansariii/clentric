"use client";

import type { MouseEvent } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useIsCurrentPage } from "@/hooks/use-is-current-page";
import { Logo, LogoMark } from "../logo";

const DASHBOARD_HREF = "/dashboard";

/** The wordmark in the app chrome; takes signed-in users to the dashboard. */
export function DashboardLogoLink({
  className,
  onClick,
  variant = "wordmark",
}: {
  className?: string;
  onClick?: () => void;
  /** "brand": app icon + name; "mark": icon only, for the collapsed sidebar. */
  variant?: "wordmark" | "brand" | "mark";
}) {
  const isCurrentPage = useIsCurrentPage();

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    // Already on the dashboard: don't refetch it.
    if (isCurrentPage(DASHBOARD_HREF)) event.preventDefault();
    onClick?.();
  };

  return (
    <Link
      href={DASHBOARD_HREF}
      onClick={handleClick}
      aria-label="Go to dashboard"
      className={cn(
        "focus-visible:ring-ring rounded-sm focus-visible:ring-2 focus-visible:outline-none",
        className,
      )}
    >
      {variant === "wordmark" ? (
        <Logo className="block h-5" aria-hidden />
      ) : (
        <span className="flex items-center gap-2.5">
          <LogoMark
            className="dark:ring-border size-7 rounded-md dark:ring-1"
            aria-hidden
          />
          {variant === "brand" && (
            <span className="text-foreground text-base font-semibold tracking-tight">
              Clentric
            </span>
          )}
        </span>
      )}
    </Link>
  );
}
