"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import {
  CopyPlusIcon,
  FolderOpenIcon,
  FolderPlusIcon,
  LinkIcon,
  MailIcon,
  MoreHorizontalIcon,
  SendIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  LedgerCell,
  LedgerTable,
  type LedgerColumn,
  type LedgerGroup,
} from "@/components/dashboard/ledger-table";
import { RowIconAction } from "@/components/dashboard/row-icon-action";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DEPOSIT_NO_PAYMENT } from "@/components/dashboard/deposit-payment-warning";
import { proposalSendDescription } from "@/lib/send-confirm";
import { DeleteDialog } from "@/components/delete-dialog";
import { CustomButton } from "@/components/ui/custom-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/ui/status-badge";
import { warnNotEmailed } from "@/lib/email/warn-not-emailed";
import { formatCurrency } from "@/lib/format-currency";
import { formatShortDate } from "@/lib/format-due";
import { runActionWithToast } from "@/lib/run-action-with-toast";
import {
  createProjectFromProposalAction,
  deleteProposalAction,
  duplicateProposalAction,
  emailProposalAction,
  sendProposalAction,
} from "./actions";
import { proposalActivity, proposalStateConfig } from "./proposal-state";
import type { ProposalListRow } from "./queries";

const COLUMNS: LedgerColumn<ProposalListRow>[] = [
  {
    key: "proposal",
    header: "Proposal",
    fill: true,
    phone: "title",
    cell: (p) => (
      <LedgerCell
        main={p.title}
        mainClassName="font-medium"
        sub={p.clientName}
      />
    ),
  },
  {
    key: "activity",
    header: "Activity",
    maxWidth: "14rem",
    phone: "detail",
    cell: (p) => (
      <LedgerCell
        main={proposalActivity(p.state, p)}
        mainClassName="text-[13px]"
        // Sends before the activity log existed have no date to show.
        sub={
          p.sentAt
            ? `Sent ${formatShortDate(p.sentAt)}`
            : p.status === "draft"
              ? "Not sent"
              : null
        }
      />
    ),
  },
  {
    key: "stages",
    header: "Stages",
    align: "right",
    show: "lg",
    cell: (p) => (
      <LedgerCell
        main={p.milestoneCount}
        mainClassName="font-space tabular-nums"
      />
    ),
  },
  {
    key: "deposit",
    header: "Deposit",
    align: "right",
    show: "lg",
    cell: (p) => {
      const deposit = Number(p.depositPercent);
      return (
        <LedgerCell
          main={deposit > 0 ? `${deposit}%` : "-"}
          mainClassName="font-space tabular-nums"
        />
      );
    },
  },
  {
    key: "created",
    header: "Created",
    show: "xl",
    cell: (p) => (
      <LedgerCell
        main={formatShortDate(p.createdAt)}
        mainClassName="text-muted-foreground text-[13px]"
      />
    ),
  },
  {
    key: "expires",
    header: "Expires",
    show: "xl",
    cell: (p) => (
      <LedgerCell
        main={
          p.expiresAt
            ? formatShortDate(p.expiresAt)
            : p.status === "draft"
              ? "-"
              : "No expiry"
        }
        mainClassName="text-muted-foreground text-[13px]"
      />
    ),
  },
  {
    key: "value",
    header: "Value",
    align: "right",
    phone: "money",
    cell: (p) => (
      <LedgerCell
        main={formatCurrency(p.total, p.currency)}
        mainClassName="font-space font-medium tabular-nums"
      />
    ),
  },
  {
    key: "status",
    header: "Status",
    phone: "status",
    cell: (p) => {
      const config = proposalStateConfig[p.state];
      return (
        <StatusBadge status={config.tone} variant="soft">
          {config.label}
        </StatusBadge>
      );
    },
  },
];

/** The list's groups: still waiting, drafts, accepted, and closed (declined, revoked, expired). */
function proposalGroup(p: ProposalListRow) {
  if (p.state === "sent" || p.state === "viewed" || p.state === "expiring") {
    return "awaiting";
  }
  if (p.state === "draft" || p.state === "accepted") return p.state;
  return "closed";
}

export function ProposalList({
  proposals,
  groups,
  hasPaymentDetails = true,
}: {
  proposals: ProposalListRow[];
  groups: LedgerGroup[];
  /** False when a deposit invoice would go out without how to pay. */
  hasPaymentDetails?: boolean;
}) {
  return (
    <LedgerTable
      rows={proposals}
      columns={COLUMNS}
      groups={groups}
      getGroup={proposalGroup}
      getAccent={(p) => (p.state === "expiring" ? "warning" : null)}
      getKey={(p) => p.id}
      getHref={(p) => `/proposals/${p.id}`}
      getLabel={(p) => `Open ${p.title}`}
      actions={(p) => (
        <ProposalRowActions proposal={p} hasPaymentDetails={hasPaymentDetails} />
      )}
    />
  );
}

function ProposalRowActions({
  proposal: p,
  hasPaymentDetails,
}: {
  proposal: ProposalListRow;
  hasPaymentDetails: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [hasOpenedDelete, setHasOpenedDelete] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);
  const state = p.state;
  const working = isPending ? "Working..." : null;
  const noEmail = p.clientHasEmail
    ? null
    : "Add an email address to this client first";

  // An email can't be recalled, so Send asks first and names the recipient.
  const send = () => setConfirmSend(true);
  const sendNow = () =>
    runActionWithToast(sendProposalAction({ proposalId: p.id }), {
      loading: "Sending proposal...",
      success: ({ emailError }) =>
        emailError
          ? "Proposal sent - the link is live"
          : "Proposal emailed to your client",
      onSuccess: ({ emailError }) => {
        warnNotEmailed(emailError, "proposal");
        router.refresh();
      },
    });

  const emailAgain = () =>
    startTransition(async () => {
      await runActionWithToast(emailProposalAction({ proposalId: p.id }), {
        loading: "Emailing the link...",
        success: "Link emailed to your client",
        onSuccess: () => router.refresh(),
      });
    });

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/p/${p.token}`,
      );
      toast.success("Client link copied");
    } catch {
      toast.error("Couldn't copy the link");
    }
  };

  const startProject = () =>
    startTransition(async () => {
      await runActionWithToast(
        createProjectFromProposalAction({ proposalId: p.id }),
        {
          loading: "Starting project...",
          success: "Project started from the proposal",
          onSuccess: ({ projectId }) => router.push(`/projects/${projectId}`),
        },
      );
    });

  const duplicate = () =>
    startTransition(async () => {
      await runActionWithToast(duplicateProposalAction({ proposalId: p.id }), {
        loading: "Duplicating...",
        success: "Draft copy created",
        onSuccess: () => router.refresh(),
      });
    });

  // One icon per row: the next step for this proposal.
  let next: ReactNode;
  if (state === "draft") {
    next = (
      <RowIconAction
        icon={SendIcon}
        label="Send"
        ariaLabel={`Send ${p.title}`}
        onClick={send}
        disabledReason={working ?? noEmail}
        tone="attention"
      />
    );
  } else if (state === "sent") {
    next = (
      <RowIconAction
        icon={LinkIcon}
        label="Copy client link"
        ariaLabel={`Copy the client link for ${p.title}`}
        onClick={copyLink}
      />
    );
  } else if (state === "viewed" || state === "expiring") {
    next = (
      <RowIconAction
        icon={MailIcon}
        label="Email link again"
        ariaLabel={`Email the link for ${p.title} again`}
        onClick={emailAgain}
        disabledReason={working ?? noEmail}
        tone="attention"
      />
    );
  } else if (state === "accepted") {
    next = p.projectId ? (
      <RowIconAction
        icon={FolderOpenIcon}
        label="View project"
        ariaLabel={`View the project for ${p.title}`}
        href={`/projects/${p.projectId}`}
      />
    ) : (
      <RowIconAction
        icon={FolderPlusIcon}
        label="Start project"
        ariaLabel={`Start a project from ${p.title}`}
        onClick={startProject}
        disabledReason={working}
        tone="attention"
      />
    );
  } else {
    next = (
      <RowIconAction
        icon={CopyPlusIcon}
        label="Duplicate"
        ariaLabel={`Duplicate ${p.title}`}
        onClick={duplicate}
        disabledReason={working}
      />
    );
  }

  return (
    <>
      {next}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <CustomButton
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`More actions for ${p.title}`}
            disabled={isPending}
            className="w-8 px-0!"
          >
            <MoreHorizontalIcon className="size-4" />
          </CustomButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {state === "draft" && (
            <DropdownMenuItem onClick={send} disabled={Boolean(noEmail)}>
              Send
            </DropdownMenuItem>
          )}
          {(state === "sent" || state === "viewed" || state === "expiring") && (
            <>
              <DropdownMenuItem onClick={copyLink}>
                Copy client link
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={emailAgain}
                disabled={Boolean(noEmail)}
              >
                Email link again
              </DropdownMenuItem>
            </>
          )}
          {state === "expiring" && (
            <DropdownMenuItem disabled>
              Extend link · coming later
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={duplicate}>Duplicate</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => {
              setHasOpenedDelete(true);
              setIsDeleteOpen(true);
            }}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={confirmSend}
        onOpenChange={setConfirmSend}
        title="Send this proposal?"
        description={proposalSendDescription(
          p.title,
          p.clientEmail ?? p.clientName,
          Number(p.depositPercent) > 0 && !hasPaymentDetails
            ? DEPOSIT_NO_PAYMENT
            : null,
        )}
        confirmLabel="Send proposal"
        pendingLabel="Sending..."
        onConfirm={sendNow}
      />

      {hasOpenedDelete && (
        <DeleteDialog
          title={`Delete "${p.title}"?`}
          description="The proposal and its client link are removed for good."
          open={isDeleteOpen}
          onOpenChange={setIsDeleteOpen}
          onDelete={async () => {
            await runActionWithToast(
              deleteProposalAction({ proposalId: p.id }),
              {
                loading: "Deleting proposal...",
                success: "Proposal deleted",
                onSuccess: () => router.refresh(),
              },
            );
          }}
        />
      )}
    </>
  );
}
