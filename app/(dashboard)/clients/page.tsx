import DashboardContainer from "@/components/dashboard/container";
import { ClientsHeader } from "./clients-header";
import { getClients } from "./queries";
import { ClientsTable } from "./clients-table";
import { clientStatusConfig, type ClientStatus } from "./client-status-config";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";

type ClientsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ClientsPage({ searchParams }: ClientsPageProps) {
  const params = await searchParams;
  const { clients, total, page, pageSize, totalPages, statusCounts, allCount } =
    await getClients(params);

  return (
    <>
      <ClientsHeader total={total} />

      <DashboardContainer>
        <ClientsTable
          data={clients}
          toolbar={
            <DataTableToolbar
              searchPlaceholder="Search clients..."
              filters={[
                {
                  key: "status",
                  label: "Filter clients by status",
                  allCount,
                  options: (
                    Object.keys(clientStatusConfig) as ClientStatus[]
                  ).map((status) => ({
                    value: status,
                    label: clientStatusConfig[status].label,
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
      </DashboardContainer>
    </>
  );
}
