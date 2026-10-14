import React from "react";
import InvoiceBuilder from "../invoice-builder";
import { getClientOptions } from "../../clients/queries";
import {
  getMilestoneForInvoice,
  getProjectOptionsByUserId,
} from "../../projects/queries";
import { getDocumentDefaults, getIssuerTitle } from "../../settings/queries";
import { formatInvoiceNumber } from "@/lib/format-invoice-number";
import { getSafeReturnTo } from "@/lib/return-to";
import { PlanLimitPage } from "@/components/dashboard/plan-limit-page";
import { planBlockMessage } from "@/lib/plan-limits";

export default async function NewInvoice({
  searchParams,
}: {
  searchParams: Promise<{
    clientId?: string;
    projectId?: string;
    /** From "Invoice stage N": prefill that milestone's line. */
    milestoneId?: string;
    returnTo?: string;
  }>;
}) {
  const { clientId, projectId, milestoneId, returnTo } = await searchParams;

  const [clients, projects, defaults, issuerName, milestone, blocked, clientBlocked] =
    await Promise.all([
      getClientOptions(),
      getProjectOptionsByUserId(),
      getDocumentDefaults(),
      getIssuerTitle(),
      getMilestoneForInvoice(milestoneId, projectId),
      planBlockMessage("invoicesPerMonth"),
      planBlockMessage("clients"),
    ]);
  if (blocked) {
    return (
      <PlanLimitPage title="New invoice" section="Invoices" sectionHref="/invoices" message={blocked} />
    );
  }

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
      returnTo={getSafeReturnTo(returnTo)}
      newClientBlocked={clientBlocked}
      initialLine={
        milestone && initialProjectId === projectId
          ? {
              description: milestone.title,
              quantity: 1,
              rate: Number(milestone.amount ?? 0),
              unit: "item",
              milestoneId: milestone.id,
            }
          : undefined
      }
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
