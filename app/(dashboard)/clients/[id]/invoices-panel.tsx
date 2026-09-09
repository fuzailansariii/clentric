"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PlusIcon } from "lucide-react";

import { DataTable } from "@/components/data-table/data-table";
import { StatsCards } from "@/components/ui/stats-cards";
import { Pagination } from "@/components/ui/pagination";
import { CustomButton } from "@/components/ui/custom-button";

import { formatCurrency } from "@/lib/format-currency";
import { usePagination } from "@/hooks/use-pagination";
import { cn } from "@/lib/utils";
import { InvoiceDisplayStatus } from "@/lib/get-invoice-display-status";

import { InvoiceListItem } from "../../invoices/queries";
import { filterInvoices } from "../../invoices/filter-invoices";
import { computeInvoiceStats } from "../../invoices/invoice-stats";
import { InvoiceFiltersBar } from "../../invoices/invoice-filters-bar";
import { invoiceColumns } from "../../invoices/invoices-columns";

const PAGE_SIZE = 10;

export function InvoicesPanel({
  invoices,
  className,
}: {
  invoices: InvoiceListItem[];
  className?: string;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<InvoiceDisplayStatus | "all">("all");
  const filtered = useMemo(
    () => filterInvoices(invoices, search, status),
    [invoices, search, status],
  );
  const stats = useMemo(() => computeInvoiceStats(filtered), [filtered]);
  const isFiltering = search.trim() !== "" || status !== "all";
  const { page, setPage, totalPages, paginatedItems } = usePagination(
    filtered,
    PAGE_SIZE,
  );
  return (
    <div
      className={cn(
        "border-border min-w-0 overflow-hidden rounded-xl border",
        className,
      )}
    >
      <StatsCards
        items={[
          {
            label: "Total Billed",
            value: formatCurrency(stats.total.toFixed(2)),
            hint: isFiltering
              ? "Matching filters"
              : `${stats.totalCount} invoices`,
          },
          {
            label: "Paid",
            value: formatCurrency(stats.paid.toFixed(2)),
            hint: `${stats.paidCount} invoices`,
          },
          {
            label: "Outstanding",
            value: formatCurrency(stats.outstanding.toFixed(2)),
            hint: `${stats.outstandingCount} invoices`,
          },
          {
            label: "Draft",
            value: formatCurrency(stats.draft.toFixed(2)),
            hint: `${stats.draftCount} not sent`,
          },
        ]}
      />
      {/* Filters + Action */}
      <div className="border-border flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="min-w-0 flex-1">
          <InvoiceFiltersBar
            search={search}
            onSearchChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            status={status}
            onStatusChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
          />
        </div>
        <Link href="/invoices/new" className="w-full sm:w-auto">
          <CustomButton
            variant="primary"
            size="sm"
            className="w-full gap-1.5 sm:w-auto"
          >
            <PlusIcon className="h-3.5 w-3.5" /> New Invoice
          </CustomButton>
        </Link>
      </div>
      {/* Invoice Table / Mobile Cards */}
      <DataTable
        columns={invoiceColumns}
        data={paginatedItems}
        getRowId={(row) => row.id}
        emptyMessage={
          isFiltering ? "No invoices match your filters." : "No invoices yet."
        }
        className="border-none"
        renderMobileCard={(invoice) => (
          <div className="px-4 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-medium">
                    INV-{String(invoice.invoiceNumber).padStart(3, "0")}
                  </span>

                  <span className="text-muted-foreground text-[10px]">•</span>

                  <span className="text-muted-foreground text-[11px] capitalize">
                    {invoice.status}
                  </span>
                </div>

                <p className="mt-1.5 truncate text-sm font-medium">
                  {invoice.clientName ?? "—"}
                </p>
              </div>
              <p className="shrink-0 text-sm font-semibold">
                {formatCurrency(invoice.total)}
              </p>
            </div>

            <div className="border-border mt-4 grid grid-cols-2 border-t pt-3">
              <div className="min-w-0 pr-3">
                <p className="text-muted-foreground text-[10px] font-medium tracking-[0.06em] uppercase">
                  Project
                </p>

                <p className="mt-1 truncate text-xs">
                  {invoice.projectTitle ?? "—"}
                </p>
              </div>

              <div className="border-border border-l pl-3">
                <p className="text-muted-foreground text-[10px] font-medium tracking-[0.06em] uppercase">
                  Due date
                </p>
                <p className="mt-1 text-xs">{invoice.dueDate}</p>
              </div>
            </div>
          </div>
        )}
      />
      {filtered.length > 0 && (
        <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <span className="text-muted-foreground text-xs">
            Showing {paginatedItems.length} of {filtered.length} invoices
          </span>
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
