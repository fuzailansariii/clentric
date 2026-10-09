import { ProposalsHeader } from "./proposals-header";
import DashboardContainer from "@/components/dashboard/container";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { StatsSummary } from "@/components/ui/stats-summary";
import { formatCurrency } from "@/lib/format-currency";
import { getProposalsByUserId } from "./queries";
import {
  proposalStatusConfig,
  type ProposalStatus,
} from "./proposal-status-config";
import { ProposalsTable } from "./proposals-table";

type ProposalsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ProposalsPage({
  searchParams,
}: ProposalsPageProps) {
  const params = await searchParams;
  const {
    proposals,
    total,
    page,
    pageSize,
    totalPages,
    statusCounts,
    allCount,
    summary,
  } = await getProposalsByUserId(params);

  return (
    <>
      <ProposalsHeader total={total} />

      <DashboardContainer>
        <div className="flex flex-col gap-4">
          {/* Totals come from the database across every matching proposal
              (search applied, status tab not) - not just the current page.
              Per-status counts are left to the filter chips below. */}
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
              {
                label: "Declined",
                value: formatCurrency(summary.declined),
                valueColor: "text-rose-500",
              },
            ]}
          />

          <ProposalsTable
            data={proposals}
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
      </DashboardContainer>
    </>
  );
}
