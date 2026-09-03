import React from "react";
import InvoiceBuilder from "../invoice-builder";
import { getClientOptions } from "../../clients/queries";
import { getProjectOptionsByUserId } from "../../projects/queries";

export default async function NewInvoice() {
  const [clients, projects] = await Promise.all([
    getClientOptions(),
    getProjectOptionsByUserId(),
  ]);
  return <InvoiceBuilder clients={clients} projects={projects} />;
}
