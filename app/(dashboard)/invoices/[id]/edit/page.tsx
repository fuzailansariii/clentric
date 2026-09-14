import { notFound, redirect } from "next/navigation";
import { getClientOptions } from "../../../clients/queries";
import { getProjectOptionsByUserId } from "../../../projects/queries";
import InvoiceBuilder from "../../invoice-builder";
import { getInvoiceById } from "../../queries";

type EditInvoicePageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditInvoicePage({
  params,
}: EditInvoicePageProps) {
  const { id } = await params;

  const [invoice, clients, projects] = await Promise.all([
    getInvoiceById(id),
    getClientOptions(),
    getProjectOptionsByUserId(),
  ]);

  if (!invoice) {
    notFound();
  }

  // Paid invoices are a closed record — the detail page shows why Edit is
  // disabled. updateInvoiceAction refuses them too.
  if (invoice.status === "paid") {
    redirect(`/invoices/${invoice.id}`);
  }

  return (
    <InvoiceBuilder
      clients={clients}
      projects={projects}
      invoice={{
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        clientId: invoice.clientId,
        projectId: invoice.projectId ?? undefined,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        taxRate: Number(invoice.taxRate),
        lineItems: invoice.lineItems.map((item) => ({
          description: item.description,
          quantity: Number(item.quantity),
          rate: Number(item.rate),
          unit: item.unit,
        })),
      }}
    />
  );
}
