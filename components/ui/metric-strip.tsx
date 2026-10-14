import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Metric = {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  /** Muted for zero-ish figures, danger for late money. */
  tone?: "default" | "muted" | "danger";
};

const COLUMNS = {
  3: "@[700px]:grid-cols-3",
  4: "@[700px]:grid-cols-4",
  6: "@[700px]:grid-cols-3 @[1100px]:grid-cols-6",
} as const;

const TONE = {
  default: "text-foreground",
  muted: "text-muted-foreground",
  danger: "text-danger-600",
} as const;

/** The money summary at the top of a detail or list page. */
export function MetricStrip({
  items,
  columns = 4,
  className,
}: {
  items: Metric[];
  columns?: keyof typeof COLUMNS;
  className?: string;
}) {
  return (
    <div className={cn("@container", className)}>
      <dl
        className={cn(
          "bg-border grid grid-cols-2 gap-px overflow-hidden rounded-lg border shadow-xs",
          COLUMNS[columns],
        )}
      >
        {items.map((item) => (
          <div
            key={item.label}
            className="bg-card flex min-w-0 flex-col gap-1 px-4 py-3.5 last:odd:col-span-2 @[700px]:last:odd:col-span-1"
          >
            <dt className="text-muted-foreground text-[12.5px]">
              {item.label}
            </dt>
            <dd
              className={cn(
                "font-space text-xl leading-tight font-medium tracking-tight whitespace-nowrap tabular-nums @[700px]:text-2xl",
                TONE[item.tone ?? "default"],
              )}
            >
              {item.value}
            </dd>
            {item.sub && (
              <dd className="text-muted-foreground truncate text-[12.5px]">
                {item.sub}
              </dd>
            )}
          </div>
        ))}
      </dl>
    </div>
  );
}
