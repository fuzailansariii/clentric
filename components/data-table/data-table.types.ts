import type { ReactNode } from "react";

export type Column<T> = {
  header: ReactNode;
  accessorKey?: keyof T;
  cell?: (row: T) => ReactNode;
  hideBelow?: "sm" | "md" | "lg" | "xl";
  /** Hide the cell's contents until the row is hovered, focused, or its menu
   * is open (always visible on touch screens). Meant for row actions. */
  revealOnHover?: boolean;
  className?: string;
};

export type DataTableProps<T> = {
  columns: Column<T>[];
  data: T[];
  getRowId?: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  getRowAriaLabel?: (row: T) => string;
  renderMobileCard?: (row: T) => ReactNode;
  emptyMessage?: ReactNode;
  /** Search + filters. Sits in the card's header bar from 640px up, above
   * the list on mobile. */
  toolbar?: ReactNode;
  /** Usually pagination. Sits in the card's footer from 640px up, below the
   * list on mobile. */
  footer?: ReactNode;
  className?: string;
};
