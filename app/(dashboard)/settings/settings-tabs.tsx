"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import { MotionConfig, motion } from "motion/react";
import { cn } from "@/lib/utils";
import { useIsCurrentPage } from "@/hooks/use-is-current-page";
import { DEFAULT_SETTINGS_TAB, SETTINGS_TABS } from "./sections";

/**
 * The settings tab bar. Each tab is a real route, so the open tab survives a
 * refresh and can be linked to - which is why these are links in a <nav>
 * with aria-current rather than an ARIA tablist.
 *
 * On a phone the three tabs split the width evenly; from a 480px container
 * up they size to their labels. The row scrolls sideways rather than
 * wrapping if a label ever outgrows the space.
 */
export function SettingsTabs() {
  // null on /settings itself (which redirects), the slug on a tab.
  const segment = useSelectedLayoutSegment() ?? DEFAULT_SETTINGS_TAB.slug;
  const isCurrentPage = useIsCurrentPage();

  return (
    <MotionConfig reducedMotion="user">
      <nav aria-label="Settings" className="@container">
        <ul className="border-border flex scrollbar-none overflow-x-auto border-b [&::-webkit-scrollbar]:hidden">
          {SETTINGS_TABS.map((tab) => {
            const isActive = tab.slug === segment;
            return (
              <li key={tab.slug} className="flex-1 @[480px]:flex-none">
                <Link
                  href={`/settings/${tab.slug}`}
                  // The open tab is already on screen; don't refetch it.
                  onClick={(event) => {
                    if (isCurrentPage(`/settings/${tab.slug}`)) {
                      event.preventDefault();
                    }
                  }}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "relative -mb-px flex h-11 items-center justify-center px-3 text-sm whitespace-nowrap transition-colors @[480px]:px-4",
                    "focus-visible:ring-ring outline-none focus-visible:ring-2 focus-visible:ring-inset",
                    isActive
                      ? "text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tab.label}
                  {isActive && (
                    <motion.span
                      layoutId="settings-tab-underline"
                      aria-hidden="true"
                      className="bg-primary absolute inset-x-0 bottom-0 h-0.5"
                      transition={{
                        type: "spring",
                        bounce: 0.18,
                        duration: 0.45,
                      }}
                    />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </MotionConfig>
  );
}
