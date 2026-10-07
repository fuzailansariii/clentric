"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { SettingsCard } from "@/components/settings/settings-card";
import { SettingsRow } from "@/components/settings/settings-row";
import { CustomButton } from "@/components/ui/custom-button";
import { cn } from "@/lib/utils";
import { DeleteAccountDialog } from "./delete-account-dialog";

// Download links styled as CustomButton's secondary variant: a download is
// navigation, so it's an <a>, not a <button>.
const secondaryLink = cn(
  "inline-flex h-8 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors",
  "bg-secondary text-secondary-foreground border-border hover:bg-accent hover:text-accent-foreground border",
  "focus-visible:ring-ring outline-none focus-visible:ring-2",
);

export function AccountCards({ email }: { email: string }) {
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <SettingsCard>
        <SettingsRow
          title="Export your data"
          detail="Clients, projects, proposals and invoices. JSON is one file; CSV is a zip with a spreadsheet per table."
        >
          <a
            href="/api/account/export?format=json"
            download
            className={secondaryLink}
          >
            <Download aria-hidden="true" className="h-4 w-4" />
            JSON
          </a>
          <a
            href="/api/account/export?format=csv"
            download
            className={secondaryLink}
          >
            <Download aria-hidden="true" className="h-4 w-4" />
            CSV
          </a>
        </SettingsRow>

        <SettingsRow
          stacked
          title="Delete account"
          detail="Locks your account straight away and deletes everything after 30 days. Sign in before then to restore it."
        >
          <CustomButton
            type="button"
            variant="danger-outline"
            size="sm"
            onClick={() => setDeleteOpen(true)}
          >
            Delete account…
          </CustomButton>
        </SettingsRow>
      </SettingsCard>

      <DeleteAccountDialog
        email={email}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  );
}
