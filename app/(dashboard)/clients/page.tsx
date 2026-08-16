import DashboardContainer from "@/components/dashboard/container";
import PageHeader from "@/components/dashboard/page-header";
import { CustomButton } from "@/components/ui/custom-button";
import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { getClients } from "./queries";
import { ClientsTable } from "./clients-table";
import { clientStatusConfig } from "./client-status-config";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";

type ClientsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ClientsPage({ searchParams }: ClientsPageProps) {
  const params = await searchParams;
  const { clients, total, page, pageSize, totalPages } =
    await getClients(params);

  return (
    <DashboardContainer>
      <PageHeader
        title="Clients"
        description="Manage your clients"
        actions={
          <CustomButton variant="primary">
            <Link href={"/clients/new"} className="flex items-center gap-2">
              <PlusIcon className="h-4 w-4" />
              Add Client
            </Link>
          </CustomButton>
        }
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Clients" },
        ]}
      />

      <div className="mt-6 flex flex-col gap-4">
        <DataTableToolbar
          searchPlaceholder="Search clients..."
          filters={[
            {
              key: "status",
              label: "All statuses",
              options: Object.entries(clientStatusConfig).map(
                ([value, config]) => ({
                  value,
                  label: config.label,
                }),
              ),
            },
          ]}
        />

        <ClientsTable data={clients} />

        <DataTablePagination
          page={page}
          pageSize={pageSize}
          total={total}
          totalPages={totalPages}
        />
      </div>
    </DashboardContainer>
  );
}
