import { notFound } from "next/navigation";
import { SettingsCard } from "@/components/settings/settings-card";
import { getPlanFeatures } from "@/lib/billing";
import { requireUser } from "@/lib/current-user";
import { getBrandingSettings } from "./queries";
import { LogoUploader } from "./logo-uploader";
import { BrandingForm } from "./branding-form";

export async function BrandingSection() {
  const user = await requireUser();
  const [branding, features] = await Promise.all([
    getBrandingSettings(),
    getPlanFeatures(user.id),
  ]);
  if (!branding) {
    notFound();
  }
  const locked = !features.customBranding;

  return (
    <SettingsCard>
      <LogoUploader
        logoSrc={branding.logoSrc}
        name={branding.displayName}
        locked={locked}
      />
      <BrandingForm branding={branding} colorLocked={locked} />
    </SettingsCard>
  );
}
