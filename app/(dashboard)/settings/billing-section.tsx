import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsRow } from "@/components/settings/settings-row";

/**
 * Beta: static, since there is no Stripe integration yet. This is the slot
 * the card on file and past receipts move into once paid plans launch.
 */
export function BillingSection() {
  return (
    <SettingsSection
      title="Billing"
      description="Clentric is free during the beta, so there's nothing to pay yet."
      flush
    >
      <SettingsRow
        title="Payment method"
        detail="None needed. We'll ask for one before paid plans start."
      />
      <SettingsRow title="Receipts" detail="No charges yet." />
    </SettingsSection>
  );
}
