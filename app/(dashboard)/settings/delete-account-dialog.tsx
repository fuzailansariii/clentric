"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CustomButton } from "@/components/ui/custom-button";
import { Field } from "@/components/ui/input";
import { ACCOUNT_DELETION_GRACE_DAYS } from "@/lib/account-deletion";
import { useReturnFocus } from "@/hooks/use-return-focus";
import { requestAccountDeletionAction } from "../account-actions";

/**
 * Radix Dialog: focus is trapped inside while open, Escape and Cancel close
 * it, and focus returns to the "Delete account…" button afterwards.
 */
export function DeleteAccountDialog({
  email,
  open,
  onOpenChange,
}: {
  email: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const returnFocus = useReturnFocus();

  // Exact match, as the action checks it: no trimming, no case-folding.
  const matches = typed === email;

  const close = (next: boolean) => {
    if (isPending) return;
    if (!next) {
      setTyped("");
      setError(null);
    }
    onOpenChange(next);
  };

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!matches) return;
    setError(null);
    startTransition(async () => {
      // Signs out everywhere and redirects to /login on success.
      const result = await requestAccountDeletionAction({ email: typed });
      if (!result.success) setError(result.error);
    });
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md" {...returnFocus}>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription asChild>
              <div className="flex flex-col gap-3">
                <ul className="list-disc space-y-1.5 pl-5">
                  <li>
                    You’ll be signed out on every device, and your account is
                    locked straight away.
                  </li>
                  <li>
                    Proposal links you’ve sent stop working for your clients.
                  </li>
                  <li>
                    After {ACCOUNT_DELETION_GRACE_DAYS} days everything is
                    deleted for good. Sign back in before then to restore it.
                  </li>
                </ul>
                <p>
                  Want a copy first?{" "}
                  <a
                    href="/api/account/export?format=json"
                    download
                    className="text-primary font-medium hover:underline"
                  >
                    Export your data
                  </a>
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>

          <Field
            id="confirm-delete-email"
            label={
              <>
                Type{" "}
                <span className="text-foreground font-bold break-all">
                  &ldquo;{email}&rdquo;
                </span>{" "}
                to confirm
              </>
            }
            value={typed}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              setTyped(event.target.value)
            }
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            error={error ?? undefined}
          />

          <DialogFooter>
            <DialogClose asChild>
              <CustomButton
                type="button"
                variant="secondary"
                size="sm"
                disabled={isPending}
              >
                Cancel
              </CustomButton>
            </DialogClose>
            <CustomButton
              type="submit"
              variant="destructive"
              size="sm"
              disabled={!matches || isPending}
            >
              {isPending && (
                <Loader2
                  aria-hidden="true"
                  className="mr-1.5 h-4 w-4 animate-spin"
                />
              )}
              Delete account
            </CustomButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
