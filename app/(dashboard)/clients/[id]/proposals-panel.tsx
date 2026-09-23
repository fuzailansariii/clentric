"use client";

import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { CustomButton } from "@/components/ui/custom-button";
import { StatsSummary } from "@/components/ui/stats-summary";
import { formatCurrency } from "@/lib/format-currency";
import {
  proposalStatusConfig,
  type ProposalStatus,
} from "../../proposals/proposal-status-config";
import { ProposalsTable } from "../../proposals/proposals-table";
import type { ProposalListResult } from "../../proposals/queries";
import { PANEL_TABLE_CLASS } from "./projects-panel";

/**
 * A client's proposals, paged and filtered on the server like the other two
 * tabs. The "New Proposal" link arrives with this client prefilled.
 */
export function ProposalsPanel({
  result,
  clientId,
}: {
  result: ProposalListResult;
  clientId: string;
}) {
  const {
    proposals,
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
              label: "Total Proposed",
              value: formatCurrency(summary.total),
            },
            {
              label: "Accepted",
              value: formatCurrency(summary.accepted),
              valueColor: "text-emerald-600",
            },
            {
              label: "Awaiting Reply",
              value: formatCurrency(summary.awaiting),
              valueColor: "text-blue-600",
            },
          ]}
        />
      </div>

      <ProposalsTable
        data={proposals}
        className={PANEL_TABLE_CLASS}
        toolbar={
          <DataTableToolbar
            searchPlaceholder="Search proposals..."
            filters={[
              {
                key: "status",
                label: "Filter proposals by status",
                allCount,
                options: (
                  Object.keys(proposalStatusConfig) as ProposalStatus[]
                ).map((status) => ({
                  value: status,
                  label: proposalStatusConfig[status].label,
                  count: statusCounts[status],
                })),
              },
            ]}
            actions={
              <Link
                href={`/proposals/new?clientId=${clientId}`}
                className="shrink-0"
              >
                <CustomButton
                  variant="primary"
                  size="sm"
                  className="h-9 gap-1.5 whitespace-nowrap @[640px]:h-8"
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                  New Proposal
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
