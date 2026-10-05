"use client";

import type { MouseEvent } from "react";
import { flushSync } from "react-dom";
import { useTheme } from "next-themes";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Variants,
} from "motion/react";
import { MoonStarIcon, SunIcon } from "lucide-react";
import { useHydrated } from "@/hooks/use-hydrated";
import { cn } from "@/lib/utils";

const SPIN = { duration: 0.5, ease: [0.65, 0, 0.35, 1] } as const;

// Both ways: the old icon spins out half a turn while the new one spins in.
const ICON_VARIANTS: Variants = {
  enter: { rotate: -180, scale: 0.5, opacity: 0 },
  center: { rotate: 0, scale: 1, opacity: 1, transition: SPIN },
  leave: { rotate: 180, scale: 0.5, opacity: 0, transition: SPIN },
};

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  // The theme is only known in the browser - render a same-size placeholder
  // until then so the icon doesn't flip after hydration.
  const hydrated = useHydrated();
  const reduceMotion = useReducedMotion();
  // resolvedTheme, not theme: with "system" chosen, theme is just "system".
  const isDark = resolvedTheme === "dark";

  if (!hydrated) {
    return (
      <span
        aria-hidden="true"
        className={cn(
          "border-border block size-9 rounded-lg border",
          className,
        )}
      />
    );
  }

  const toggle = (e: MouseEvent<HTMLButtonElement>) => {
    const next = isDark ? "light" : "dark";
    if (reduceMotion || !document.startViewTransition) {
      setTheme(next);
      return;
    }
    // The new theme grows as a circle out of the button.
    const { left, top, width, height } =
      e.currentTarget.getBoundingClientRect();
    const x = left + width / 2;
    const y = top + height / 2;
    const r = Math.hypot(
      Math.max(x, innerWidth - x),
      Math.max(y, innerHeight - y),
    );
    // flushSync so the class flips inside the snapshot callback.
    const transition = document.startViewTransition(() =>
      flushSync(() => setTheme(next)),
    );
    transition.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${r}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 800,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          pseudoElement: "::view-transition-new(root)",
        },
      );
    });
  };

  const label = isDark ? "Switch to light theme" : "Switch to dark theme";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={cn(
        "border-border text-muted-foreground hover:border-foreground/20 hover:text-foreground hover:bg-accent flex size-9 cursor-pointer items-center justify-center overflow-hidden rounded-lg border transition-colors",
        "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
        className,
      )}
    >
      {/* Both icons share one grid cell, so they can cross mid-animation. */}
      <span className="grid">
        <AnimatePresence initial={false}>
          <motion.span
            key={isDark ? "sun" : "moon"}
            variants={reduceMotion ? undefined : ICON_VARIANTS}
            initial="enter"
            animate="center"
            exit="leave"
            className="col-start-1 row-start-1 flex"
          >
            {isDark ? (
              <SunIcon className="size-4" />
            ) : (
              <MoonStarIcon className="size-4" />
            )}
          </motion.span>
        </AnimatePresence>
      </span>
    </button>
  );
}
