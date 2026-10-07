import { notFound } from "next/navigation";
import { SettingsCard } from "@/components/settings/settings-card";
import { getPaymentSettings } from "./queries";
import { PaymentMethodsList } from "./payment-methods-list";
import { PaymentInstructionsForm } from "./payment-instructions-form";

export async function PaymentsSection() {
  const settings = await getPaymentSettings();

  // requireUser() has already run, so a missing row means the profile was
  // never created rather than that nobody is signed in.
  if (!settings) {
    notFound();
  }

  // One card: a row per method, then the optional note underneath.
  return (
    <SettingsCard>
      <PaymentMethodsList methods={settings.methods} />
      <PaymentInstructionsForm instructions={settings.instructions} />
    </SettingsCard>
  );
}
