import { cn } from "@/lib/utils";

export function MilestoneProgress({
  completed,
  total,
  progress,
  fill = false,
  showCount = true,
  className,
}: {
  completed: number;
  total: number;
  /** 0-100, precomputed by the query. */
  progress: number;
  /** Stretch the bar to the available width (mobile rows). */
  fill?: boolean;
  showCount?: boolean;
  className?: string;
}) {
  if (total === 0) {
    return (
      <span className={cn("text-muted-foreground text-xs", className)}>
        No milestones
      </span>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        role="progressbar"
        aria-label="Milestones completed"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={completed}
        className={cn(
          "bg-secondary h-1 overflow-hidden rounded-full",
          fill ? "flex-1" : "w-18",
        )}
      >
        <div
          className="bg-primary h-full rounded-full"
          style={{ width: `${progress}%` }}
        />
      </div>
      {showCount && (
        <span className="text-muted-foreground text-xs tabular-nums">
          {completed}/{total}
        </span>
      )}
    </div>
  );
}
