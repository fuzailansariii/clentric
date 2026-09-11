import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type StatItem = {
  label: string;
  value: ReactNode;
  hint?: string;
  /** Tailwind text-color class for the value, e.g. "text-emerald-600".
   * Defaults to the standard foreground color when omitted. */
  valueColor?: string;
};

type StatsCardsVariant = "cards" | "divided";

export function StatsCards({
  items,
  variant = "cards",
}: {
  items: StatItem[];
  variant?: StatsCardsVariant;
}) {
  const isDivided = variant === "divided";

  return (
    <div className="@container">
      <div
        className={cn(
          "grid grid-cols-2 @[640px]:grid-cols-4",
          isDivided
            ? "bg-border gap-px"
            : "gap-2 p-3 @[640px]:gap-3 @[640px]:p-5",
        )}
      >
        {items.map((item) => (
          <div
            key={item.label}
            className={cn(
              "min-w-0 overflow-hidden px-3 py-2.5 @[640px]:px-5 @[640px]:py-4",
              isDivided
                ? "bg-background hover:bg-paper-50 dark:hover:bg-ink-900/40 transition-colors"
                : cn(
                    "border-border bg-card rounded-xl border shadow-sm transition-colors",
                    "hover:bg-paper-50 dark:hover:bg-ink-900/60",
                  ),
            )}
          >
            <div className="text-muted-foreground truncate font-mono text-[9px] font-medium tracking-wider uppercase @[640px]:text-[10px] @[640px]:tracking-[0.08em]">
              {item.label}
            </div>

            <div
              className={cn(
                "mt-1 min-w-0 text-base font-semibold tracking-tight @[640px]:mt-1.5 @[640px]:text-2xl",
                item.valueColor ?? "text-foreground",
              )}
            >
              {item.value}
            </div>

            {item.hint && (
              <div className="text-muted-foreground mt-0.5 truncate text-[10.5px] @[640px]:text-xs">
                {item.hint}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
