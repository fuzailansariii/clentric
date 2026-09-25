import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { SettingsGroup } from "@/components/settings/settings-group";
import {
  LEGACY_SETTINGS_SLUGS,
  getSettingsTab,
  type SettingsSlug,
} from "../sections";
import { ProfileSection } from "../profile-section";
import { AccountSection } from "../account-section";
import { BusinessSection } from "../business-section";
import { PaymentsSection } from "../payments-section";
import { PlanSection } from "../plan-section";
import { BillingSection } from "../billing-section";

// What each tab holds, top to bottom. The sections fetch their own data, so
// every group on a tab loads in parallel.
const TAB_CONTENT: Record<SettingsSlug, () => ReactNode> = {
  account: () => (
    <>
      <SettingsGroup
        title="Profile"
        description="How you appear in inside Clentric"
      >
        <ProfileSection />
      </SettingsGroup>
      <SettingsGroup
        title="Your data"
        description="Take a copy of everything, or close your account."
      >
        <AccountSection />
      </SettingsGroup>
    </>
  ),
  business: () => (
    <>
      <SettingsGroup
        title="Business details"
        description="Who your invoices and proposals come from."
      >
        <BusinessSection />
      </SettingsGroup>
      <SettingsGroup
        title="Payment methods"
        description="Switched-on methods are printed on your new invoices."
      >
        <PaymentsSection />
      </SettingsGroup>
    </>
  ),
  billing: () => (
    <>
      <SettingsGroup
        title="Plan"
        description="What you're on and what you've used."
      >
        <PlanSection />
      </SettingsGroup>
      <SettingsGroup title="Billing" description="How you pay for Clentric.">
        <BillingSection />
      </SettingsGroup>
    </>
  ),
};

export default async function SettingsTabPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section: slug } = await params;

  // Section URLs from before the tabs (e.g. /settings/payments) still work.
  const legacyTarget = LEGACY_SETTINGS_SLUGS[slug];
  if (legacyTarget) {
    redirect(`/settings/${legacyTarget}`);
  }

  const tab = getSettingsTab(slug);
  if (!tab) {
    notFound();
  }

  return <div className="flex flex-col gap-5">{TAB_CONTENT[tab.slug]()}</div>;
}
