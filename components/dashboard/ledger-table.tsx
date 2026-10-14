import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { formatCurrency } from "@/lib/format-currency";
import { cn } from "@/lib/utils";

/** Where a column sits in the phone card: title | money | ⋮, then detail | status. */
type PhoneRole = "title" | "money" | "detail" | "status";

export type LedgerColumn<T> = {
  key: string;
  header: ReactNode;
  /** The one column that takes the spare width; every other column hugs its content. */
  fill?: boolean;
  /** Caps a content column, e.g. "13rem"; longer text truncates. */
  maxWidth?: string;
  align?: "left" | "right";
  /** Smallest list width where the column shows; md = always on desktop. */
  show?: "md" | "lg" | "xl";
  /** Role in the phone card; left out = hidden on phone. */
  phone?: PhoneRole;
  cell: (row: T) => ReactNode;
};

/** A status group: its heading shows the whole group's count and total, not just this page's. */
export type LedgerGroup = {
  key: string;
  label: string;
  count: number;
  sum: string;
};

/** A thin left stripe on rows that need you. */
export type LedgerAccent = "danger" | "warning" | null;

const SHOW: Record<NonNullable<LedgerColumn<unknown>["show"]>, string> = {
  md: "hidden @[700px]:block",
  lg: "hidden @[1000px]:block",
  xl: "hidden @[1240px]:block",
};

const PHONE_AREA: Record<PhoneRole, string> = {
  title: "@max-[699px]:[grid-area:title]",
  money: "@max-[699px]:[grid-area:money]",
  detail: "@max-[699px]:[grid-area:detail]",
  status: "@max-[699px]:[grid-area:status]",
};

const ACCENT: Record<NonNullable<LedgerAccent>, string> = {
  danger:
    "shadow-[inset_3px_0_0_var(--color-danger-600)] @[700px]:shadow-[inset_3px_0_0_var(--color-danger-600)]",
  warning:
    "shadow-[inset_3px_0_0_var(--color-warning-600)] @[700px]:shadow-[inset_3px_0_0_var(--color-warning-600)]",
};

function tracks<T>(columns: LedgerColumn<T>[], sizes: string[]) {
  return [
    ...columns
      .filter((c) => sizes.includes(c.show ?? "md"))
      .map((c) => (c.fill ? "minmax(10rem,1fr)" : "auto")),
    "auto", // actions
  ].join(" ");
}

// Rows share the table's columns (subgrid), so content-sized columns line up
// across rows and the only spare width goes to the fill column.
const ROW = cn(
  "relative",
  "@max-[699px]:grid @max-[699px]:grid-cols-[minmax(0,1fr)_auto_auto] @max-[699px]:gap-x-3 @max-[699px]:gap-y-2 @max-[699px]:[grid-template-areas:'title_money_act'_'detail_status_status']",
  "@[700px]:col-span-full @[700px]:grid @[700px]:grid-cols-subgrid @[700px]:items-center",
);

/**
 * The list table every workspace page uses: a tinted header, rows grouped by
 * status with each group's count and total, one column order (who/what,
 * details, money, status, actions), and the same card on phone.
 */
export function LedgerTable<T>({
  rows,
  columns,
  getKey,
  getHref,
  getLabel,
  actions,
  groups,
  getGroup,
  getAccent,
}: {
  rows: T[];
  columns: LedgerColumn<T>[];
  getKey: (row: T) => string;
  getHref: (row: T) => string;
  /** Accessible name for the row link, e.g. "Open INV-045". */
  getLabel: (row: T) => string;
  /** One icon for the next step, then the ⋮ menu. */
  actions: (row: T) => ReactNode;
  /** In display order; rows should already be sorted the same way. */
  groups?: LedgerGroup[];
  getGroup?: (row: T) => string;
  getAccent?: (row: T) => LedgerAccent;
}) {
  const style = {
    "--cols-md": tracks(columns, ["md"]),
    "--cols-lg": tracks(columns, ["md", "lg"]),
    "--cols-xl": tracks(columns, ["md", "lg", "xl"]),
  } as CSSProperties;

  const cellClass = (column: LedgerColumn<T>) =>
    cn(
      "min-w-0",
      column.align === "right" && "text-right",
      column.phone ? PHONE_AREA[column.phone] : SHOW[column.show ?? "md"],
      column.phone && column.show && column.show !== "md" && SHOW[column.show],
      column.phone === "status" && "@max-[699px]:justify-self-end",
      column.phone === "money" && "@max-[699px]:text-right",
      column.phone === "detail" && "@max-[699px]:text-left",
    );
  const cellStyle = (column: LedgerColumn<T>) =>
    column.maxWidth ? { maxWidth: column.maxWidth } : undefined;

  const sections =
    groups && getGroup
      ? groups
          .map((group) => ({
            group,
            rows: rows.filter((row) => getGroup(row) === group.key),
          }))
          .filter((section) => section.rows.length > 0)
      : [{ group: null, rows }];

  const renderRow = (row: T) => {
    const accent = getAccent?.(row) ?? null;
    return (
      <li
        key={getKey(row)}
        className={cn(
          ROW,
          "bg-card rounded-lg border p-3.5 shadow-xs transition-colors",
          "hover:bg-muted/50 @[700px]:min-h-13 @[700px]:rounded-none @[700px]:border-0 @[700px]:border-t @[700px]:px-4 @[700px]:py-2 @[700px]:shadow-none",
          accent && ACCENT[accent],
        )}
      >
        {/* The whole row opens the record; the actions sit above this link. */}
        <Link
          href={getHref(row)}
          aria-label={getLabel(row)}
          className="focus-visible:ring-ring absolute inset-0 rounded-lg focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset @[700px]:rounded-none"
        />
        {columns.map((column) => (
          <div
            key={column.key}
            style={cellStyle(column)}
            className={cellClass(column)}
          >
            {column.cell(row)}
          </div>
        ))}
        <div className="relative z-10 flex items-center justify-end gap-0.5 @max-[699px]:[grid-area:act]">
          {actions(row)}
        </div>
      </li>
    );
  };

  return (
    <div className="@container" style={style}>
      <div className="@[700px]:bg-card flex flex-col gap-2 @[700px]:grid @[700px]:grid-cols-(--cols-md) @[700px]:gap-x-6 @[700px]:gap-y-0 @[700px]:overflow-hidden @[700px]:rounded-lg @[700px]:border @[700px]:shadow-xs @[1000px]:grid-cols-(--cols-lg) @[1240px]:grid-cols-(--cols-xl)">
        <div
          aria-hidden="true"
          className={cn(
            ROW,
            "text-muted-foreground bg-secondary/60 hidden h-10 px-4 text-[11px] font-medium tracking-[0.06em] uppercase @max-[699px]:hidden @[700px]:grid",
          )}
        >
          {columns.map((column) => (
            <span
              key={column.key}
              style={cellStyle(column)}
              className={cn(
                SHOW[column.show ?? "md"],
                "truncate",
                column.align === "right" && "text-right",
              )}
            >
              {column.header}
            </span>
          ))}
          <span />
        </div>

        {sections.map(({ group, rows: sectionRows }) => (
          <section
            key={group?.key ?? "all"}
            aria-label={group ? `${group.label}, ${group.count}` : undefined}
            className="flex flex-col gap-2 @[700px]:col-span-full @[700px]:grid @[700px]:grid-cols-subgrid @[700px]:gap-x-6 @[700px]:gap-y-0"
          >
            {group && (
              <div className="flex items-baseline justify-between gap-3 px-1 pt-2 @[700px]:col-span-full @[700px]:border-t @[700px]:px-4 @[700px]:pt-3.5 @[700px]:pb-1.5">
                <h3 className="text-[13px] font-semibold">
                  {group.label}
                  <span className="text-muted-foreground font-space ml-1.5 text-xs font-normal tabular-nums">
                    {group.count}
                  </span>
                </h3>
                <span className="text-muted-foreground font-space text-[13px] tabular-nums">
                  {formatCurrency(group.sum)}
                </span>
              </div>
            )}
            <ul className="flex flex-col gap-2 @[700px]:col-span-full @[700px]:grid @[700px]:grid-cols-subgrid @[700px]:gap-x-6 @[700px]:gap-y-0">
              {sectionRows.map(renderRow)}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

/** The cell every column uses: main text, then an optional muted line. */
export function LedgerCell({
  main,
  sub,
  mainClassName,
  subClassName,
}: {
  main: ReactNode;
  sub?: ReactNode;
  mainClassName?: string;
  subClassName?: string;
}) {
  return (
    <>
      <span className={cn("block truncate text-sm", mainClassName)}>
        {main}
      </span>
      {sub !== undefined && sub !== null && sub !== "" && (
        <span
          className={cn(
            "text-muted-foreground block truncate text-[12.5px]",
            subClassName,
          )}
        >
          {sub}
        </span>
      )}
    </>
  );
}
