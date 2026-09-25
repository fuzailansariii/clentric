import type { ReactNode } from "react";
import DashboardContainer from "@/components/dashboard/container";
import { SettingsHeader } from "./settings-header";
import { SettingsTabs } from "./settings-tabs";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SettingsHeader />
      <DashboardContainer>
        {/* Container, not viewport: the sidebar takes real width, so the
            groups inside decide their layout from this box's width. Capped
            so lines stay readable on very wide screens. */}
        <div className="@container mx-auto w-full max-w-5xl">
          <SettingsTabs />
          <div className="min-w-0 pt-6 @[860px]:pt-8">{children}</div>
        </div>
      </DashboardContainer>
    </>
  );
}
