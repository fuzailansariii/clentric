"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Ban, Copy, Send } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { CustomButton } from "@/components/ui/custom-button";
import { runActionWithToast } from "@/lib/run-action-with-toast";
import { revokeProposalAction, sendProposalAction } from "../actions";
import type { ProposalStatus } from "../proposal-status-config";

type ProposalActionsProps = {
  proposalId: string;
  token: string;
  status: ProposalStatus;
};

/** Where the client opens the proposal, relative to whatever host is serving. */
export function publicProposalPath(token: string) {
  return `/p/${token}`;
}

export function ProposalActions({
  proposalId,
  token,
  status,
}: ProposalActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  const canSend = status === "draft";
  const canRevoke = status === "sent" || status === "viewed";
  // A draft has a token but the public page refuses to serve it, so offering
  // the link before sending would hand out a URL that reports itself gone.
  const linkIsLive = !canSend && status !== "revoked" && status !== "expired";

  const onSend = () => {
    startTransition(async () => {
      await runActionWithToast(sendProposalAction({ proposalId }), {
        loading: "Sending proposal...",
        success: "Proposal sent — the link is live",
        onSuccess: () => router.refresh(),
      });
    });
  };

  const onRevoke = async () => {
    await runActionWithToast(revokeProposalAction({ proposalId }), {
      loading: "Revoking link...",
      success: "Link revoked",
      onSuccess: () => router.refresh(),
    });
  };

  const onCopyLink = async () => {
    const url = `${window.location.origin}${publicProposalPath(token)}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      // Clipboard access needs a secure context and permission; neither is
      // guaranteed, so fall back to showing the URL rather than failing mute.
      toast.error("Could not copy automatically", { description: url });
    }
  };

  if (!canSend && !canRevoke && !linkIsLive) {
    return null;
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        {canSend && (
          <CustomButton
            type="button"
            onClick={onSend}
            disabled={isPending}
            className="w-full justify-center gap-1.5"
          >
            <Send className="h-4 w-4" />
            {isPending ? "Sending..." : "Send proposal"}
          </CustomButton>
        )}

        {linkIsLive && (
          <CustomButton
            type="button"
            variant="secondary"
            onClick={onCopyLink}
            className="w-full justify-center gap-1.5"
          >
            <Copy className="h-4 w-4" />
            Copy client link
          </CustomButton>
        )}

        {canRevoke && (
          <CustomButton
            type="button"
            variant="secondary"
            onClick={() => setConfirmRevoke(true)}
            className="text-danger-600 w-full justify-center gap-1.5"
          >
            <Ban className="h-4 w-4" />
            Revoke link
          </CustomButton>
        )}
      </div>

      <ConfirmDialog
        open={confirmRevoke}
        onOpenChange={setConfirmRevoke}
        title="Revoke this link?"
        description="Anyone holding the link will stop being able to open the proposal. This cannot be undone — you would need to create a new proposal to share it again."
        confirmLabel="Revoke link"
        pendingLabel="Revoking..."
        variant="destructive"
        onConfirm={onRevoke}
      />
    </>
  );
}
