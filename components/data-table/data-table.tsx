"use client";
import { cn } from "@/lib/utils";
import type { Column, DataTableProps } from "./data-table.types";

function getVisibilityClass(hideBelow?: Column<unknown>["hideBelow"]) {
  switch (hideBelow) {
    case "sm":
      return "hidden @[640px]:table-cell";

    case "md":
      return "hidden @[768px]:table-cell";

    case "lg":
      return "hidden @[1024px]:table-cell";

    case "xl":
      return "hidden @[1280px]:table-cell";
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

export function DataTable<T>({
  columns,
  data,
  getRowId,
  onRowClick,
  renderMobileCard,
  getRowAriaLabel,
  emptyMessage = "No records yet.",
  className,
}: DataTableProps<T>) {
  const hasMobileCards = Boolean(renderMobileCard);

  if (data.length === 0) {
    return (
      <div
        className={cn(
          "border-border min-w-0 overflow-hidden rounded-xl border",
          className,
        )}
      >
        <div className="flex min-h-40 items-center justify-center px-6 py-12">
          <p className="text-muted-foreground text-sm">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="@container w-full">
      {/* ----------------------------------------
          Desktop / Tablet
      ----------------------------------------- */}
      <div
        className={cn(
          "w-full",
          hasMobileCards ? "hidden @[640px]:block" : "block",
        )}
      >
        <div
          className={cn(
            "border-border w-full overflow-hidden rounded-xl border",
            className,
          )}
        >
          <table className="w-full border-collapse text-[13.5px]">
            <thead>
              <tr>
                {columns.map((column, index) => (
                  <th
                    key={index}
                    scope="col"
                    className={cn(
                      "text-muted-foreground/70 bg-paper-50 dark:bg-ink-900",
                      "border-border border-b",
                      "px-4 py-2.5",
                      "text-left",
                      "font-mono text-[10.5px]",
                      "font-medium uppercase",
                      "tracking-[0.06em]",
                      "whitespace-nowrap",
                      "align-middle",

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
              {data.map((row, rowIndex) => {
                const rowId = getRowId ? getRowId(row) : rowIndex;

                const clickable = Boolean(onRowClick);

                return (
                  <tr
                    key={rowId}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    onKeyDown={
                      onRowClick
                        ? (event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              onRowClick(row);
                            }
                          }
                        : undefined
                    }
                    tabIndex={clickable ? 0 : undefined}
                    className={cn(
                      "group",
                      "border-border border-b",
                      "last:border-b-0",
                      "transition-colors",
                      clickable && "cursor-pointer hover:bg-white/1.5",
                      clickable && "focus-visible:bg-white/2",
                      clickable && "focus-visible:outline-none",
                    )}
                  >
                    {columns.map((column, columnIndex) => (
                      <td
                        key={columnIndex}
                        className={cn(
                          "border-0",
                          "px-4 py-2.5",
                          "align-middle",
                          "text-[13.5px]",

                          getVisibilityClass(column.hideBelow),

                          column.className,
                        )}
                        tabIndex={clickable ? 0 : undefined}
                        role={clickable ? "button" : undefined}
                        aria-label={
                          clickable && getRowAriaLabel
                            ? getRowAriaLabel(row)
                            : undefined
                        }
                      >
                        {getCellValue(row, column)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ----------------------------------------
          Mobile
      ----------------------------------------- */}
      {renderMobileCard && (
        <div className="@[640px]:hidden">
          <div className="border-border overflow-hidden rounded-xl border">
            {data.map((row, rowIndex) => {
              const rowId = getRowId ? getRowId(row) : rowIndex;

              const clickable = Boolean(onRowClick);

              return (
                <div
                  key={rowId}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  onKeyDown={
                    onRowClick
                      ? (event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            onRowClick(row);
                          }
                        }
                      : undefined
                  }
                  tabIndex={clickable ? 0 : undefined}
                  role={clickable ? "button" : undefined}
                  aria-label={
                    clickable && getRowAriaLabel
                      ? getRowAriaLabel(row)
                      : undefined
                  }
                  className={cn(
                    "border-border border-b",
                    "last:border-b-0",
                    clickable &&
                      "cursor-pointer transition-colors hover:bg-white/1.5",
                    clickable && "focus-visible:bg-white/2",
                    clickable && "focus-visible:outline-none",
                  )}
                >
                  {renderMobileCard(row)}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
