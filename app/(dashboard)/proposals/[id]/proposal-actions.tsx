"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Ban,
  Copy,
  CopyPlus,
  FolderKanban,
  PencilIcon,
  Send,
  Trash2Icon,
} from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DeleteDialog } from "@/components/delete-dialog";
import { CustomButton } from "@/components/ui/custom-button";
import { runActionWithToast } from "@/lib/run-action-with-toast";
import {
  createProjectFromProposalAction,
  deleteProposalAction,
  duplicateProposalAction,
  revokeProposalAction,
  sendProposalAction,
} from "../actions";
import type { ProposalStatus } from "../proposal-status-config";

type ProposalActionsProps = {
  proposalId: string;
  token: string;
  status: ProposalStatus;
  project: { id: string; title: string } | null;
};

/** Where the client opens the proposal, relative to whatever host is serving. */
export function publicProposalPath(token: string) {
  return `/p/${token}`;
}

export function ProposalActions({
  proposalId,
  token,
  status,
  project,
}: ProposalActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const canSend = status === "draft";
  const canRevoke = status === "sent" || status === "viewed";
  // A draft has a token but the public page refuses to serve it, so offering
  // the link before sending would hand out a URL that reports itself gone.
  const linkIsLive = !canSend && status !== "revoked" && status !== "expired";

  const onSend = () => {
    startTransition(async () => {
      await runActionWithToast(sendProposalAction({ proposalId }), {
        loading: "Sending proposal...",
        success: "Proposal sent - the link is live",
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

  const onStartProject = () => {
    startTransition(async () => {
      await runActionWithToast(
        createProjectFromProposalAction({ proposalId }),
        {
          loading: "Starting project...",
          success: "Project created",
          onSuccess: ({ projectId }) => router.push(`/projects/${projectId}`),
        },
      );
    });
  };

  const onDelete = async () => {
    await runActionWithToast(deleteProposalAction({ proposalId }), {
      loading: "Deleting proposal...",
      success: "Proposal deleted",
      onSuccess: () => router.push("/proposals"),
      onError: (error) => {
        throw error;
      },
    });
  };

  const onDuplicate = () => {
    startTransition(async () => {
      await runActionWithToast(duplicateProposalAction({ proposalId }), {
        loading: "Duplicating...",
        success: "Draft copy created",
        onSuccess: ({ proposalId: copyId }) =>
          router.push(`/proposals/${copyId}`),
      });
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

  // Duplicate is always available: copying a declined or expired proposal to
  // try again is one of the main reasons to reach for it.

  return (
    <>
      <div className="flex flex-col gap-2">
        {/* Accepting now creates the project automatically. These two cover
            proposals accepted before that shipped, and the case where the
            project was deleted afterwards. */}
        {status === "accepted" &&
          (project ? (
            <Link href={`/projects/${project.id}`} className="w-full">
              <CustomButton
                type="button"
                variant="secondary"
                className="w-full justify-center gap-1.5"
              >
                <FolderKanban className="h-4 w-4" />
                View project
              </CustomButton>
            </Link>
          ) : (
            <CustomButton
              type="button"
              onClick={onStartProject}
              disabled={isPending}
              className="w-full justify-center gap-1.5"
            >
              <FolderKanban className="h-4 w-4" />
              {isPending ? "Starting..." : "Start project"}
            </CustomButton>
          ))}

        {/* Drafts only: a sent proposal is already open at a link the client
            may be reading, and an accepted one is a record of what was
            agreed. */}
        {status === "draft" && (
          <Link href={`/proposals/${proposalId}/edit`} className="w-full">
            <CustomButton
              type="button"
              variant="secondary"
              className="w-full justify-center gap-1.5"
            >
              <PencilIcon className="h-4 w-4" />
              Edit
            </CustomButton>
          </Link>
        )}

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

        <CustomButton
          type="button"
          variant="secondary"
          onClick={onDuplicate}
          disabled={isPending}
          className="w-full justify-center gap-1.5"
        >
          <CopyPlus className="h-4 w-4" />
          Duplicate
        </CustomButton>

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

      <CustomButton
        type="button"
        variant="secondary"
        onClick={() => setConfirmDelete(true)}
        className="text-danger-600 w-full justify-center gap-1.5"
      >
        <Trash2Icon className="h-4 w-4" />
        Delete
      </CustomButton>

      <ConfirmDialog
        open={confirmRevoke}
        onOpenChange={setConfirmRevoke}
        title="Revoke this link?"
        description="Anyone holding the link will stop being able to open the proposal. This cannot be undone - you would need to create a new proposal to share it again."
        confirmLabel="Revoke link"
        pendingLabel="Revoking..."
        variant="destructive"
        onConfirm={onRevoke}
      />

      <DeleteDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        onDelete={onDelete}
        title="Delete Proposal"
        description={
          status === "accepted"
            ? "This proposal was accepted. Deleting it removes your record of what was agreed — any project created from it is kept, but will no longer link back here. This can't be undone."
            : "Are you sure you want to delete this proposal? Its link will stop working. This can't be undone."
        }
      />
    </>
  );
}
