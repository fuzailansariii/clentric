export const dynamic = "force-dynamic";
import React from "react";
import NewProjectsForm from "./new-project-form";
import { getClientOptions } from "../../clients/queries";

export default async function NewProjectsPage() {
  const clients = await getClientOptions();

  return <NewProjectsForm clients={clients} />;
}
