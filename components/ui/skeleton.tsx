import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

/** Grey pulsing placeholder; size and shape come from className. */
export function Skeleton({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      aria-hidden="true"
      style={style}
      className={cn(
        "bg-foreground/8 dark:bg-foreground/12 animate-pulse rounded motion-reduce:animate-none",
        className,
      )}
    />
  );
}
