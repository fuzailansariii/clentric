import React from "react";
import InvoiceBuilder from "../invoice-builder";
import { getClientOptions } from "../../clients/queries";
import { getProjectOptionsByUserId } from "../../projects/queries";
import { getDocumentDefaults, getIssuerTitle } from "../../settings/queries";
import { formatInvoiceNumber } from "@/lib/format-invoice-number";

export default async function NewInvoice({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; projectId?: string }>;
}) {
  const { clientId, projectId } = await searchParams;

  const [clients, projects, defaults, issuerName] = await Promise.all([
    getClientOptions(),
    getProjectOptionsByUserId(),
    getDocumentDefaults(),
    getIssuerTitle(),
  ]);

  const initialClientId = clients.some((c) => c.id === clientId)
    ? clientId
    : undefined;

  const matchedProject = projects.find((p) => p.id === projectId);

  const initialProjectId =
    matchedProject && matchedProject.clientId === initialClientId
      ? matchedProject.id
      : undefined;

  return (
    <InvoiceBuilder
      issuerName={issuerName}
      clients={clients}
      projects={projects}
      initialClientId={initialClientId}
      initialProjectId={initialProjectId}
      defaults={
        defaults
          ? {
              paymentTermsDays: defaults.paymentTermsDays,
              taxRate: Number(defaults.defaultTaxRate),
              notes: defaults.defaultInvoiceNotes ?? "",
              // A preview, not a reservation: the number is only taken when
              // the invoice is saved (see getNextInvoiceNumber).
              nextNumberLabel: formatInvoiceNumber(
                defaults.lastInvoiceNumber + 1,
                defaults.invoicePrefix,
              ),
            }
          : undefined
      }
    />
  );
}
