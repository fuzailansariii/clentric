import { notFound } from "next/navigation";
import { Settings } from "lucide-react";
import DashboardContainer from "@/components/dashboard/container";
import PageHeader from "@/components/dashboard/page-header";
import { getMyProfile } from "./queries";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const profile = await getMyProfile();

  // requireUser() has already run, so a missing row means the profile was
  // never created rather than that nobody is signed in.
  if (!profile) {
    notFound();
  }

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Your details, payment information and branding"
        icon={<Settings className="h-5 w-5" />}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Settings" },
        ]}
      />
      <DashboardContainer>
        <SettingsForm profile={profile} />
      </DashboardContainer>
    </>
  );
}
