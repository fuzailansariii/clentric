import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsRow } from "@/components/settings/settings-row";
import { getEffectivePlan } from "@/lib/billing";
import { requireUser } from "@/lib/current-user";
import { ManageBillingButton } from "./billing-buttons";

/** Card on file and receipts live in the payment provider's portal. */
export async function BillingSection() {
  const user = await requireUser();
  const state = await getEffectivePlan(user.id);

  // A customer id alone means checkout was opened, not that anything was paid.
  if (!state.row?.subscriptionId) {
    return (
      <SettingsSection
        title="Billing"
        description={
          state.source === "beta"
            ? "Clentric is free during the beta, so there's nothing to pay yet."
            : "You haven't paid for anything yet."
        }
        flush
      >
        <SettingsRow title="Payment method" detail="None on file." />
        <SettingsRow title="Receipts" detail="No charges yet." />
      </SettingsSection>
    );
  }

  return (
    <SettingsSection
      title="Billing"
      description="Payments are handled by our payment provider."
      flush
    >
      <SettingsRow
        title="Card, receipts and cancelling"
        detail="Update your card, download receipts or cancel your plan."
      >
        <ManageBillingButton />
      </SettingsRow>
    </SettingsSection>
  );
}
