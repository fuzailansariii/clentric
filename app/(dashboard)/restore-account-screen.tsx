"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/logo";
import { CustomButton } from "@/components/ui/custom-button";
import {
  keepAccountDeletedAction,
  restoreAccountAction,
} from "./account-actions";

/**
 * Shown by the dashboard layout, in place of the app, to a user whose
 * account is pending deletion. Nothing else in the dashboard works for them
 * meanwhile (requireUser refuses the account).
 */
export function RestoreAccountScreen({
  deletionDate,
}: {
  /** Already formatted, e.g. "24 Oct 2026". */
  deletionDate: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<"restore" | "keep">();
  const [error, setError] = useState<string | null>(null);

  const restore = () => {
    setError(null);
    setPendingAction("restore");
    startTransition(async () => {
      // Redirects to the dashboard on success.
      const result = await restoreAccountAction();
      if (!result.success) setError(result.error);
    });
  };

  const keepDeleted = () => {
    setPendingAction("keep");
    startTransition(async () => {
      await keepAccountDeletedAction();
    });
  };

  return (
    <main className="bg-background flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="bg-card w-full max-w-md rounded-xl border p-6 shadow-sm sm:p-8">
        <Logo />
        <h1 className="font-space mt-6 text-xl font-medium tracking-tight">
          Your account is scheduled for deletion on {deletionDate}.
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Until then everything is kept exactly as it was. Restore your account
          to pick up where you left off, or leave it and it will be deleted for
          good on that date.
        </p>

        {error && (
          <p role="alert" className="text-danger-600 mt-4 text-sm">
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <CustomButton
            type="button"
            variant="secondary"
            onClick={keepDeleted}
            disabled={isPending}
          >
            {isPending && pendingAction === "keep" && (
              <Loader2
                aria-hidden="true"
                className="mr-1.5 h-4 w-4 animate-spin"
              />
            )}
            Keep it deleted
          </CustomButton>
          <CustomButton type="button" onClick={restore} disabled={isPending}>
            {isPending && pendingAction === "restore" && (
              <Loader2
                aria-hidden="true"
                className="mr-1.5 h-4 w-4 animate-spin"
              />
            )}
            Restore my account
          </CustomButton>
        </div>
      </div>
    </main>
  );
}
