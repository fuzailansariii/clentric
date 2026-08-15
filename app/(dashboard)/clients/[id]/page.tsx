import DashboardContainer from "@/components/dashboard/container";
import { getClientById } from "../queries";
import PageHeader from "@/components/dashboard/page-header";
import { ClientDetail } from "./client-details";
import { notFound } from "next/navigation";
import { getProjectsByClientId } from "../../projects/queries";

type ClientPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ClientPage({ params }: ClientPageProps) {
  const { id } = await params;
  //   const client = await getClientById(id);
  const [client, projects] = await Promise.all([
    getClientById(id),
    getProjectsByClientId(id),
  ]);

  if (!client) notFound();

  return (
    <DashboardContainer>
      <PageHeader
        title={client.name}
        description="Client details"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Clients", href: "/clients" },
          { label: client.name },
        ]}
      />
      <div className="mt-6">
        <ClientDetail client={client} projects={projects} />
      </div>
    </DashboardContainer>
  );
}
