import { getClientById } from "../queries";
import { ClientDetail } from "./client-details";
import { notFound } from "next/navigation";
import { getProjectsByClientId } from "../../projects/queries";
import { getInvoicesByClientId } from "../../invoices/queries";

type ClientPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ClientPage({
  params,
  searchParams,
}: ClientPageProps) {
  const { id } = await params;
  const query = await searchParams;
  const [client, projects, invoices] = await Promise.all([
    getClientById(id),
    getProjectsByClientId(id),
    getInvoicesByClientId(id),
  ]);

  if (!client) notFound();

  return (
    <ClientDetail
      client={client}
      invoices={invoices}
      projects={projects}
      initialEdit={query.edit === "true"}
    />
  );
}
