"use client";

import { useSelectedLayoutSegment } from "next/navigation";
import { Settings } from "lucide-react";
import PageHeader from "@/components/dashboard/page-header";
import { getSettingsTab } from "./sections";

/**
 * Client wrapper so the header can live in the settings layout (which never
 * re-renders on navigation) and still show the open tab in the breadcrumbs.
 */
export function SettingsHeader() {
  const tab = getSettingsTab(useSelectedLayoutSegment());

  return (
    <PageHeader
      title="Settings"
      subtitle={tab?.description ?? "Your account, your business and your plan."}
      icon={<Settings className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        tab ? { label: "Settings", href: "/settings" } : { label: "Settings" },
        ...(tab ? [{ label: tab.label }] : []),
      ]}
    />
  );
}
