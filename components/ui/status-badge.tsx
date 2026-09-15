import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type StatusTone = "info" | "success" | "warning" | "danger" | "neutral";

// Tinted background + matching text color per tone. Shared with IconTile so
// a list row's leading mark and its status pill always agree.
export const statusToneStyles: Record<StatusTone, string> = {
  info: "bg-primary/12 text-primary",
  success: "bg-success-600/12 text-success-600",
  warning: "bg-warning-600/12 text-warning-600",
  danger: "bg-danger-600/12 text-danger-600",
  neutral: "bg-foreground/8 text-muted-foreground",
};

export function StatusBadge({
  status,
  children,
  className,
  variant = "pill",
  size = "md",
}: {
  status: StatusTone;
  children: ReactNode;
  className?: string;
  /** "pill": rounded-rectangle badge (detail pages). "soft": fully rounded
   * with a leading dot (list rows). */
  variant?: "pill" | "soft";
  /** Only affects "soft" — "sm" for dense mobile rows. */
  size?: "sm" | "md";
}) {
  if (variant === "soft") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap before:size-1.5 before:shrink-0 before:rounded-full before:bg-current",
          size === "sm"
            ? "h-5 pr-2 pl-1.5 text-[11px]"
            : "h-5.5 pr-2.5 pl-2 text-xs",
          statusToneStyles[status],
          className,
        )}
      >
        {children}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium",
        statusToneStyles[status],
        className,
      )}
    >
      {children}
    </span>
  );
}
