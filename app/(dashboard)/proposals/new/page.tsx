import { PlanLimitPage } from "@/components/dashboard/plan-limit-page";
import { planBlockMessage } from "@/lib/plan-limits";
import { getSafeReturnTo } from "@/lib/return-to";
import { getClientOptions } from "../../clients/queries";
import {
  getDocumentDefaults,
  getHasPaymentDetails,
} from "../../settings/queries";
import ProposalBuilder from "../proposal-builder";

export default async function NewProposal({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; returnTo?: string }>;
}) {
  const { clientId, returnTo } = await searchParams;
  const [clients, defaults, blocked, clientBlocked, hasPaymentDetails] =
    await Promise.all([
      getClientOptions(),
      getDocumentDefaults(),
      planBlockMessage("proposals"),
      planBlockMessage("clients"),
      getHasPaymentDetails(),
    ]);
  if (blocked) {
    return (
      <PlanLimitPage title="New proposal" section="Proposals" sectionHref="/proposals" message={blocked} />
    );
  }

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
      brandColor={defaults?.brandColor ?? null}
      hasPaymentDetails={hasPaymentDetails}
      newClientBlocked={clientBlocked}
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
