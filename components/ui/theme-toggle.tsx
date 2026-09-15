"use client";

import { useTheme } from "next-themes";
import { MoonIcon, SunIcon } from "lucide-react";
import { useHydrated } from "@/hooks/use-hydrated";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  // The theme is only known in the browser — render a same-size placeholder
  // until then so the icon doesn't flip after hydration.
  const hydrated = useHydrated();
  const isDark = theme === "dark";

  if (!hydrated) {
    return (
      <span
        aria-hidden="true"
        className={cn("border-border block size-9 rounded-lg border", className)}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className={cn(
        "border-border text-muted-foreground hover:border-foreground/20 hover:text-foreground hover:bg-accent flex size-9 cursor-pointer items-center justify-center rounded-lg border transition-colors",
        "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
        className,
      )}
    >
      {isDark ? (
        <SunIcon className="size-4" />
      ) : (
        <MoonIcon className="size-4" />
      )}
    </button>
  );
}
