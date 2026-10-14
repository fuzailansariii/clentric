import DashboardContainer from "@/components/dashboard/container";
import { ListEmpty, ListNoResults } from "@/components/dashboard/list-states";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { MetricStrip } from "@/components/ui/metric-strip";
import { formatCurrency } from "@/lib/format-currency";
import { ProposalList } from "./proposal-list";
import { ProposalsHeader } from "./proposals-header";
import { getProposalList } from "./queries";

type ProposalsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export default async function ProposalsPage({
  searchParams,
}: ProposalsPageProps) {
  const params = await searchParams;
  const list = await getProposalList(params);
  const search = typeof params.search === "string" ? params.search : "";
  const { strip, counts } = list;
  const isEmpty = counts.all === 0 && !search;
  const { won, decided } = strip.win;

  return (
    <>
      <ProposalsHeader
        subtitle={
          isEmpty
            ? "Nothing here yet"
            : `${plural(counts.all, "proposal")} · USD`
        }
      />

      <DashboardContainer>
        {isEmpty ? (
          <ListEmpty
            title="No proposals yet"
            body="Scope the work, set a price and send a link. An accepted proposal becomes a project."
            href="/proposals/new"
            label="New proposal"
          />
        ) : (
          <div className="flex flex-col gap-4">
            <MetricStrip
              columns={3}
              items={[
                {
                  label: "Awaiting reply",
                  value: formatCurrency(strip.awaiting.sum),
                  sub: plural(strip.awaiting.count, "proposal"),
                },
                {
                  label: "Accepted this quarter",
                  value: formatCurrency(strip.quarter.sum),
                  sub: plural(strip.quarter.count, "proposal"),
                },
                {
                  label: "Win rate",
                  value: decided
                    ? `${Math.round((won / decided) * 100)}%`
                    : "-",
                  sub: `${won} of ${decided} decided`,
                },
              ]}
            />

            <DataTableToolbar
              searchPlaceholder="Search proposals..."
              filters={[
                {
                  key: "view",
                  label: "Filter proposals",
                  allCount: counts.all,
                  options: [
                    { value: "draft", label: "Drafts", count: counts.draft },
                    {
                      value: "awaiting",
                      label: "Awaiting reply",
                      count: counts.awaiting,
                    },
                    {
                      value: "accepted",
                      label: "Accepted",
                      count: counts.accepted,
                    },
                    { value: "closed", label: "Closed", count: counts.closed },
                  ],
                },
              ]}
            />

            {list.proposals.length === 0 ? (
              <ListNoResults
                noun="proposals"
                search={search}
                clearHref="/proposals"
              />
            ) : (
              <ProposalList proposals={list.proposals} groups={list.groups} />
            )}

            <DataTablePagination
              page={list.page}
              pageSize={list.pageSize}
              total={list.total}
              totalPages={list.totalPages}
            />
          </div>
        )}
      </DashboardContainer>
    </>
  );
}
