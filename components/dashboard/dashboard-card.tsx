import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, type LucideIcon } from "lucide-react";

import { statusToneStyles } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

export function DashboardCard({
  id,
  title,
  count,
  viewAllHref,
  children,
}: {
  id: string;
  title: string;
  count?: number;
  viewAllHref?: string;
  children: ReactNode;
}) {
  return (
    // Container query: the open sidebar eats into the width.
    <section
      aria-labelledby={id}
      className="border-border bg-card @container flex h-full flex-col overflow-hidden rounded-xl border shadow-sm"
    >
      <header className="border-border flex items-center justify-between gap-3 border-b px-4 py-3.5">
        <h2 id={id} className="flex items-center gap-2 text-sm font-semibold">
          {title}
          {count !== undefined && count > 0 && (
            <span className="text-muted-foreground font-normal tabular-nums">
              {count}
            </span>
          )}
        </h2>
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex items-center gap-1 rounded-md text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            View all
            <ArrowRight className="size-3.5" />
          </Link>
        )}
      </header>
      {children}
    </section>
  );
}

export function DashboardCardEmpty({
  icon: Icon,
  title,
  text,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-10 text-center @3xl:py-12">
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex size-9 items-center justify-center rounded-full [&_svg]:size-4",
          statusToneStyles.neutral,
        )}
      >
        <Icon />
      </span>
      <div className="flex max-w-xs flex-col gap-0.5">
        <h3 className="text-sm font-medium">{title}</h3>
        <p className="text-muted-foreground text-xs leading-relaxed">{text}</p>
      </div>
    </div>
  );
}
