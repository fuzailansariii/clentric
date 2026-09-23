import { getClientOptions } from "../../clients/queries";
import ProposalBuilder from "../proposal-builder";

export default async function NewProposal({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const { clientId } = await searchParams;
  const clients = await getClientOptions();

  // Only prefill from the URL when the id really belongs to this user's
  // clients — the action checks ownership too, but a bogus id should never
  // reach the form as a selected value.
  const initialClientId = clients.some((client) => client.id === clientId)
    ? clientId
    : undefined;

  return (
    <ProposalBuilder clients={clients} initialClientId={initialClientId} />
  );
}
