import { cn } from "@/lib/utils";
import type { ProjectListItem } from "./queries";


export function DeadlineProgress({
  daysUntilDeadline,
  deadlineSpanDays,
  className,
}: Pick<ProjectListItem, "daysUntilDeadline" | "deadlineSpanDays"> & {
  className?: string;
}) {
  if (daysUntilDeadline === null || deadlineSpanDays === null) return null;

  const late = daysUntilDeadline < 0;
  const elapsedDays = deadlineSpanDays - daysUntilDeadline;

  // A deadline set for the creation day itself has no span to fill — treat
  // it as fully used.
  const percent =
    deadlineSpanDays <= 0
      ? 100
      : Math.min(
          100,
          Math.max(0, Math.round((elapsedDays / deadlineSpanDays) * 100)),
        );

  return (
    <div
      role="progressbar"
      aria-label="Time used until deadline"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className={cn("bg-secondary h-1 overflow-hidden rounded-full", className)}
    >
      <div
        className={cn(
          "h-full rounded-full",
          late ? "bg-danger-600" : "bg-primary",
        )}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
