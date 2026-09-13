import { notFound } from "next/navigation";
import { getInvoiceById } from "../queries";
import { getClientById } from "../../clients/queries";
import { getProjectById } from "../../projects/queries";
import { InvoiceDetail } from "./invoice-detail";

type InvoicePageProps = {
  params: Promise<{ id: string }>;
};

export default async function InvoicePage({ params }: InvoicePageProps) {
  const { id } = await params;

  // null means the invoice doesn't exist (or isn't yours). A failed query
  // throws instead, so it reaches the error page rather than a 404.
  const invoice = await getInvoiceById(id);

  if (!invoice) {
    notFound();
  }

  const [client, project] = await Promise.all([
    getClientById(invoice.clientId),
    invoice.projectId ? getProjectById(invoice.projectId) : null,
  ]);

  return <InvoiceDetail invoice={invoice} client={client} project={project} />;
}
