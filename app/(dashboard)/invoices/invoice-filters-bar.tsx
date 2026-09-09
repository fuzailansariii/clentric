"use client";
import { SearchInput } from "@/components/ui/search-input";
import { FilterSelect } from "@/components/ui/filter-select";
import {
  invoiceStatusConfig,
  type InvoiceStatus,
} from "./invoice-status-config";

type InvoiceFiltersBarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  status: InvoiceStatus | "all";
  onStatusChange: (value: InvoiceStatus | "all") => void;
};

export function InvoiceFiltersBar({
  search,
  onSearchChange,
  status,
  onStatusChange,
}: InvoiceFiltersBarProps) {
  const statusOptions = Object.entries(invoiceStatusConfig).map(
    ([value, config]) => ({
      value: value as InvoiceStatus,
      label: config.label,
    }),
  );

  return (
    <div className="flex items-center gap-2 py-3.5">
      <SearchInput
        value={search}
        onChange={onSearchChange}
        placeholder="Search invoices..."
        className="max-w-xs flex-1"
      />
      <FilterSelect
        value={status}
        onChange={onStatusChange}
        options={statusOptions}
        allLabel="All"
        ariaLabel="Filter by status"
      />
    </div>
  );
}
