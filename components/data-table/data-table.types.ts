import type { ReactNode } from "react";

export type Column<T> = {
  header: string;
  accessorKey?: keyof T;
  cell?: (row: T) => ReactNode;
  hideBelow?: "sm" | "md" | "lg" | "xl";
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
};
