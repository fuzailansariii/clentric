"use client";

import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { CustomButton } from "@/components/ui/custom-button";
import { StatsSummary } from "@/components/ui/stats-summary";
import { formatCurrency } from "@/lib/format-currency";
import {
  invoiceStatusConfig,
  type InvoiceStatus,
} from "../../invoices/invoice-status-config";
import { InvoicesTable } from "../../invoices/invoices-table";
import type { InvoiceListResult } from "../../invoices/queries";
import { PANEL_TABLE_CLASS } from "./projects-panel";

/**
 * A client's invoices, paged, searched and filtered on the server. Stat
 * totals are summed in the database across every matching invoice, not just
 * the rows on this page.
 */
export function InvoicesPanel({
  clientId,
  result,
}: {
  clientId: string;
  result: InvoiceListResult;
}) {
  const {
    invoices,
    total,
    page,
    pageSize,
    totalPages,
    statusCounts,
    allCount,
    summary,
  } = result;

  return (
    <div className="min-w-0">
      <div className="px-3 py-3 @[640px]:px-5 @[640px]:py-4">
        <StatsSummary
          items={[
            {
              label: "Total Billed",
              value: formatCurrency(summary.total),
            },
            {
              label: "Paid",
              value: formatCurrency(summary.paid),
              valueColor: "text-emerald-600",
            },
            {
              label: "Outstanding",
              value: formatCurrency(summary.outstanding),
              valueColor: "text-blue-600",
            },
            {
              label: "Overdue",
              value: formatCurrency(summary.overdue),
              valueColor: "text-rose-500",
            },
          ]}
        />
      </div>

      <InvoicesTable
        data={invoices}
        className={PANEL_TABLE_CLASS}
        toolbar={
          <DataTableToolbar
            searchPlaceholder="Search by number or project..."
            filters={[
              {
                key: "status",
                label: "Filter invoices by status",
                allCount,
                options: (
                  Object.keys(invoiceStatusConfig) as InvoiceStatus[]
                ).map((status) => ({
                  value: status,
                  label: invoiceStatusConfig[status].label,
                  count: statusCounts[status],
                })),
              },
            ]}
            actions={
              // Prefills this client on the new-invoice form.
              <Link
                href={`/invoices/new?clientId=${clientId}`}
                className="shrink-0"
              >
                <CustomButton
                  variant="primary"
                  size="sm"
                  className="h-9 gap-1.5 whitespace-nowrap @[640px]:h-8"
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                  New Invoice
                </CustomButton>
              </Link>
            }
          />
        }
        footer={
          <DataTablePagination
            page={page}
            pageSize={pageSize}
            total={total}
            totalPages={totalPages}
          />
        }
      />
    </div>
  );
}
