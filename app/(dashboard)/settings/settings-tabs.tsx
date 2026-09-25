"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import { cn } from "@/lib/utils";
import { DEFAULT_SETTINGS_TAB, SETTINGS_TABS } from "./sections";

/**
 * The settings tab bar. Each tab is a real route, so the open tab survives a
 * refresh and can be linked to — which is why these are links in a <nav>
 * with aria-current rather than an ARIA tablist.
 *
 * On a phone the three tabs split the width evenly; from a 480px container
 * up they size to their labels. The row scrolls sideways rather than
 * wrapping if a label ever outgrows the space.
 */
export function SettingsTabs() {
  // null on /settings itself (which redirects), the slug on a tab.
  const segment = useSelectedLayoutSegment() ?? DEFAULT_SETTINGS_TAB.slug;

  return (
    <nav aria-label="Settings" className="@container">
      <ul className="border-border flex scrollbar-none overflow-x-auto border-b [&::-webkit-scrollbar]:hidden">
        {SETTINGS_TABS.map((tab) => {
          const isActive = tab.slug === segment;
          return (
            <li key={tab.slug} className="flex-1 @[480px]:flex-none">
              <Link
                href={`/settings/${tab.slug}`}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "-mb-px flex h-11 items-center justify-center border-b-2 px-3 text-sm whitespace-nowrap transition-colors @[480px]:px-4",
                  "focus-visible:ring-ring outline-none focus-visible:ring-2 focus-visible:ring-inset",
                  isActive
                    ? "border-primary text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground border-transparent",
                )}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
