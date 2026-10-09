"use client";

import { useId, type ReactNode } from "react";
import { motion, MotionConfig } from "motion/react";
import { cn } from "@/lib/utils";

export type SegmentedOption<T extends string> = {
  value: T;
  label: ReactNode;
};

/**
 * Single-choice pill group. The active pill slides to the picked option.
 * "track" sits the options in one bordered pill; "chips" gives each its own border.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  variant = "track",
  className,
  itemClassName,
}: {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name for the group. */
  label: string;
  variant?: "track" | "chips";
  className?: string;
  itemClassName?: string;
}) {
  const id = useId();
  return (
    <MotionConfig reducedMotion="user">
      <div
        role="group"
        aria-label={label}
        className={cn(
          variant === "track"
            ? "bg-card inline-flex rounded-lg border p-1"
            : "flex flex-wrap gap-2",
          className,
        )}
      >
        {options.map((o) => {
          const on = o.value === value;
          return (
            <motion.button
              key={o.value}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(o.value)}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 600, damping: 30 }}
              className={cn(
                "group/seg relative inline-flex h-10 cursor-pointer items-center gap-2 px-4 text-sm font-medium whitespace-nowrap transition-colors duration-200",
                variant === "track" ? "rounded-md" : "rounded-lg",
                variant === "chips" &&
                  (on ? "border-foreground border" : "bg-card border"),
                on ? "text-background" : "text-foreground",
                itemClassName,
              )}
            >
              {on && (
                <motion.span
                  layoutId={`${id}-pill`}
                  aria-hidden="true"
                  className="bg-foreground absolute inset-0 rounded-[inherit]"
                  transition={{ type: "spring", bounce: 0.18, duration: 0.5 }}
                />
              )}
              <span className="relative inline-flex items-center gap-2">
                {o.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </MotionConfig>
  );
}
