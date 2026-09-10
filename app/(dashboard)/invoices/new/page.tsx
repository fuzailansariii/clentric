import React from "react";
import InvoiceBuilder from "../invoice-builder";
import { getClientOptions } from "../../clients/queries";
import { getProjectOptionsByUserId } from "../../projects/queries";

export default async function NewInvoice({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; projectId?: string }>;
}) {
  const { clientId, projectId } = await searchParams;

  const [clients, projects] = await Promise.all([
    getClientOptions(),
    getProjectOptionsByUserId(),
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
      clients={clients}
      projects={projects}
      initialClientId={initialClientId}
      initialProjectId={initialProjectId}
    />
  );
}
