import { notFound } from "next/navigation";
import { SettingsCard } from "@/components/settings/settings-card";
import { getBrandingSettings } from "./queries";
import { LogoUploader } from "./logo-uploader";
import { BrandingForm } from "./branding-form";

export async function BrandingSection() {
  const branding = await getBrandingSettings();
  if (!branding) {
    notFound();
  }

  return (
    <SettingsCard>
      <LogoUploader logoSrc={branding.logoSrc} name={branding.displayName} />
      <BrandingForm branding={branding} />
    </SettingsCard>
  );
}
