export const dynamic = "force-dynamic";
import { PlanLimitPage } from "@/components/dashboard/plan-limit-page";
import { planBlockMessage } from "@/lib/plan-limits";
import { ProjectForm } from "../project-form";
import { getClientOptions } from "../../clients/queries";

export default async function NewProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const [{ clientId }, clients, blocked] = await Promise.all([
    searchParams,
    getClientOptions(),
    planBlockMessage("projects"),
  ]);
  if (blocked) {
    return (
      <PlanLimitPage title="New project" section="Projects" sectionHref="/projects" message={blocked} />
    );
  }

  // Only prefill an id that really is one of this user's clients; the
  // action checks ownership too, but a bogus id should never reach the form.
  const initialClientId = clients.some((client) => client.id === clientId)
    ? clientId
    : undefined;

  return <ProjectForm clients={clients} initialClientId={initialClientId} />;
}
