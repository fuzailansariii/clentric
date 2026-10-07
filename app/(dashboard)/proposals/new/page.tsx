import { getSafeReturnTo } from "@/lib/return-to";
import { getClientOptions } from "../../clients/queries";
import { getDocumentDefaults } from "../../settings/queries";
import ProposalBuilder from "../proposal-builder";

export default async function NewProposal({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; returnTo?: string }>;
}) {
  const { clientId, returnTo } = await searchParams;
  const [clients, defaults] = await Promise.all([
    getClientOptions(),
    getDocumentDefaults(),
  ]);

  // Only prefill from the URL when the id really belongs to this user's
  // clients - the action checks ownership too, but a bogus id should never
  // reach the form as a selected value.
  const initialClientId = clients.some((client) => client.id === clientId)
    ? clientId
    : undefined;

  return (
    <ProposalBuilder
      clients={clients}
      initialClientId={initialClientId}
      returnTo={getSafeReturnTo(returnTo)}
      defaults={
        defaults
          ? {
              expiresInDays: defaults.defaultProposalExpiryDays,
              depositPercent: Number(defaults.defaultDepositPercent),
            }
          : undefined
      }
    />
  );
}
