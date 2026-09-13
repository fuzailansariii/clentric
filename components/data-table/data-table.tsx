"use client";
import type { KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import type { Column, DataTableProps } from "./data-table.types";

// Thresholds are the table's own width, not the viewport's. The sidebar
// (64px collapsed / 256px expanded) and page padding (80px) come off first,
// so a 1440px laptop gives the table only ~1080–1280px — viewport-style
// 768/1024/1280 steps left the widest tier unreachable on most laptops.
// These steps are sized to when the extra columns actually fit.
function getVisibilityClass(hideBelow?: Column<unknown>["hideBelow"]) {
  switch (hideBelow) {
    case "sm":
      return "hidden @[640px]:table-cell";

    case "md":
      return "hidden @[720px]:table-cell";

    case "lg":
      return "hidden @[860px]:table-cell";

    case "xl":
      return "hidden @[1000px]:table-cell";
    default:
      return "";
  }
}

function getCellValue<T>(row: T, column: Column<T>) {
  if (column.cell) {
    return column.cell(row);
  }

  if (column.accessorKey) {
    const value = row[column.accessorKey];

    if (value === null || value === undefined || value === "") {
      return <span className="text-muted-foreground">—</span>;
    }

    return String(value);
  }

  return null;
}

const rowInteractive =
  "cursor-pointer transition-colors hover:bg-secondary/50 focus-visible:bg-secondary/50 focus-visible:outline-none";

// Row actions stay out of the way until the row is pointed at, focused, or
// its menu is open. Touch screens can't hover, so they always show them.
const revealOnHover =
  "*:transition-opacity *:opacity-0 group-hover/row:*:opacity-100 group-focus-within/row:*:opacity-100 has-[[data-state=open]]:*:opacity-100 [@media(hover:none)]:*:opacity-100";

// One card holds toolbar, rows and pagination. With mobile cards the frame
// only starts at 640px — below that those three stack as separate pieces.
// overflow-clip (not hidden) rounds the corners without becoming a scroll
// container, so the sticky header still pins to the dashboard's <main>.
const frame = "overflow-clip rounded-xl border border-border bg-card";
const frameFrom640 =
  "flex flex-col gap-3 @[640px]:gap-0 @[640px]:overflow-clip @[640px]:rounded-xl @[640px]:border @[640px]:border-border @[640px]:bg-card";

export function DataTable<T>({
  columns,
  data,
  getRowId,
  onRowClick,
  renderMobileCard,
  getRowAriaLabel,
  emptyMessage = "No records yet.",
  toolbar,
  footer,
  className,
}: DataTableProps<T>) {
  const hasMobileCards = Boolean(renderMobileCard);
  const clickable = Boolean(onRowClick);

  const handleRowKeyDown = (row: T) => (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    // Enter on a control inside the row (e.g. the actions menu) belongs to
    // that control — it shouldn't also open the row.
    if (
      (event.target as HTMLElement).closest(
        "button, a, input, [role='menuitem']",
      )
    ) {
      return;
    }
    event.preventDefault();
    onRowClick?.(row);
  };

  return (
    <div className="@container w-full">
      <div className={cn(hasMobileCards ? frameFrom640 : frame, className)}>
        {toolbar && (
          <div
            className={
              hasMobileCards
                ? "@[640px]:border-border @[640px]:border-b @[640px]:px-4 @[640px]:py-3"
                : "border-border border-b px-4 py-3"
            }
          >
            {toolbar}
          </div>
        )}

        {data.length === 0 ? (
          <div
            className={cn(
              "flex min-h-40 items-center justify-center px-6 py-12",
              hasMobileCards &&
                "border-border bg-card rounded-xl border @[640px]:rounded-none @[640px]:border-0 @[640px]:bg-transparent",
            )}
          >
            <p className="text-muted-foreground text-sm">{emptyMessage}</p>
          </div>
        ) : (
          <>
            {/* ----------------------------------------
                Desktop / Tablet
            ----------------------------------------- */}
            <div className={hasMobileCards ? "hidden @[640px]:block" : "block"}>
              <table className="w-full border-collapse text-[13.5px]">
                <thead>
                  <tr>
                    {columns.map((column, index) => (
                      <th
                        key={index}
                        scope="col"
                        className={cn(
                          "bg-card text-muted-foreground sticky top-0 z-10",
                          "border-border border-b",
                          "px-4 py-2.5",
                          "text-left align-middle text-xs font-medium whitespace-nowrap",

                          getVisibilityClass(column.hideBelow),

                          column.className,
                        )}
                      >
                        {column.header}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {data.map((row, rowIndex) => (
                    <tr
                      key={getRowId ? getRowId(row) : rowIndex}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                      onKeyDown={clickable ? handleRowKeyDown(row) : undefined}
                      tabIndex={clickable ? 0 : undefined}
                      className={cn(
                        "group/row border-border border-b last:border-b-0",
                        clickable && rowInteractive,
                      )}
                    >
                      {columns.map((column, columnIndex) => {
                        // The actions cell holds its own buttons, so it
                        // isn't also announced as a "view row" button.
                        const cellOpensRow = clickable && !column.revealOnHover;

                        return (
                          <td
                            key={columnIndex}
                            className={cn(
                              "px-4 py-3 align-middle",

                              getVisibilityClass(column.hideBelow),

                              column.revealOnHover && revealOnHover,

                              column.className,
                            )}
                            tabIndex={cellOpensRow ? 0 : undefined}
                            role={cellOpensRow ? "button" : undefined}
                            aria-label={
                              cellOpensRow && getRowAriaLabel
                                ? getRowAriaLabel(row)
                                : undefined
                            }
                          >
                            {getCellValue(row, column)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ----------------------------------------
                Mobile
            ----------------------------------------- */}
            {renderMobileCard && (
              <div className="border-border bg-card overflow-hidden rounded-xl border @[640px]:hidden">
                {data.map((row, rowIndex) => (
                  <div
                    key={getRowId ? getRowId(row) : rowIndex}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    onKeyDown={clickable ? handleRowKeyDown(row) : undefined}
                    tabIndex={clickable ? 0 : undefined}
                    role={clickable ? "button" : undefined}
                    aria-label={
                      clickable && getRowAriaLabel
                        ? getRowAriaLabel(row)
                        : undefined
                    }
                    className={cn(
                      // Divider starts after the leading mark (12px padding
                      // + 36px mark + 10px gap), like a native list.
                      "relative not-first:before:border-border not-first:before:absolute not-first:before:top-0 not-first:before:right-0 not-first:before:left-[58px] not-first:before:border-t",
                      clickable && rowInteractive,
                    )}
                  >
                    {renderMobileCard(row)}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {footer}
      </div>
    </div>
  );
}
