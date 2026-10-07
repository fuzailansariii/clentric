export const dynamic = "force-dynamic";
import NewProjectsForm from "./new-project-form";
import { getClientOptions } from "../../clients/queries";

export default async function NewProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const [{ clientId }, clients] = await Promise.all([
    searchParams,
    getClientOptions(),
  ]);

  // Only prefill an id that really is one of this user's clients; the
  // action checks ownership too, but a bogus id should never reach the form.
  const initialClientId = clients.some((client) => client.id === clientId)
    ? clientId
    : undefined;

  return (
    <NewProjectsForm clients={clients} initialClientId={initialClientId} />
  );
}
