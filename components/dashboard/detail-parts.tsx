import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** A card on a detail page; the title is optional. */
export function DetailCard({
  title,
  aside,
  children,
  className,
}: {
  title?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "bg-card min-w-0 rounded-lg border p-4 shadow-xs sm:p-4.5",
        className,
      )}
    >
      {title && (
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">{title}</h2>
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

export type DetailRow = {
  label: string;
  value: ReactNode;
  tone?: "danger" | "warning";
};

/** Label on the left, value on the right, hairlines between rows. */
export function DetailList({ rows }: { rows: DetailRow[] }) {
  return (
    <dl>
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex items-baseline justify-between gap-4 border-t py-2.25 text-[13.5px] first:border-t-0 first:pt-0"
        >
          <dt className="text-muted-foreground shrink-0">{row.label}</dt>
          <dd
            className={cn(
              "min-w-0 text-right font-medium wrap-anywhere",
              row.tone === "danger" && "text-danger-600",
              row.tone === "warning" && "text-warning-600",
            )}
          >
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export type TimelineTone = "neutral" | "info" | "success" | "warning" | "danger";

export type TimelineItem = {
  title: string;
  detail?: string;
  tone?: TimelineTone;
  /** Hasn't happened yet: hollow dot, muted text. */
  upcoming?: boolean;
};

const DOT: Record<TimelineTone, string> = {
  neutral: "border-foreground/30 bg-foreground/30",
  info: "border-primary bg-primary",
  success: "border-success-600 bg-success-600",
  warning: "border-warning-600 bg-warning-600",
  danger: "border-danger-600 bg-danger-600",
};

/** What happened, oldest first, joined by a thin line. */
export function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <ol>
      {items.map((item, index) => (
        <li
          key={`${item.title}-${index}`}
          className="relative flex gap-3 pb-4 last:pb-0"
        >
          {index < items.length - 1 && (
            <span
              aria-hidden="true"
              className="bg-foreground/15 absolute top-4.25 bottom-0.25 left-1.25 w-px"
            />
          )}
          <span
            aria-hidden="true"
            className={cn(
              "mt-1 size-2.75 shrink-0 rounded-full border-2",
              item.upcoming
                ? "border-foreground/30 bg-transparent"
                : DOT[item.tone ?? "neutral"],
            )}
          />
          <div className="min-w-0">
            <p
              className={cn(
                "text-[13.5px] font-medium wrap-anywhere",
                item.upcoming && "text-muted-foreground",
              )}
            >
              {item.title}
            </p>
            {item.detail && (
              <p className="text-muted-foreground text-[12.5px] wrap-anywhere">
                {item.detail}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
