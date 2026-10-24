"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  CopyIcon,
  CopyPlusIcon,
  ExternalLinkIcon,
  PencilIcon,
  SendIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import PageHeader from "@/components/dashboard/page-header";
import {
  CardActions,
  HeaderActions,
  MoreMenu,
  type PageAction,
} from "@/components/dashboard/page-actions";
import {
  DetailCard,
  Timeline,
  type TimelineItem,
} from "@/components/dashboard/detail-parts";
import { BrandLogo } from "@/components/brand-logo";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DeleteDialog } from "@/components/delete-dialog";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import {
  CustomButton,
  customButtonClasses,
} from "@/components/ui/custom-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useWithinWindow } from "@/hooks/use-within-window";
import { resolveBrandColor } from "@/lib/brand-color";
import type { EmailStatus } from "@/lib/email/quota";
import { EMAIL_LIMITS } from "@/lib/email/quota-rules";
import { warnNotEmailed } from "@/lib/email/warn-not-emailed";
import { formatCurrency, formatPercent } from "@/lib/format-currency";
import { formatDate } from "@/lib/format-date";
import { formatShortDate } from "@/lib/format-due";
import { formatIssuer } from "@/lib/format-issuer";
import { runActionWithToast } from "@/lib/run-action-with-toast";
import { cn } from "@/lib/utils";
import {
  createProjectFromProposalAction,
  deleteProposalAction,
  duplicateProposalAction,
  emailProposalAction,
  revokeProposalAction,
  sendProposalAction,
} from "../actions";
import { depositAmounts } from "@/lib/deposit-amounts";
import {
  DEPOSIT_NO_PAYMENT,
  DepositPaymentWarning,
} from "@/components/dashboard/deposit-payment-warning";
import { proposalSendDescription } from "@/lib/send-confirm";
import { proposalActivity, proposalStateConfig } from "../proposal-state";
import type { ProposalDetail } from "../queries";

type ProposalDetailViewProps = {
  proposal: ProposalDetail;
  /** The live project created from this proposal, when there is one. */
  project: { id: string; title: string } | null;
  /** Null unless the proposal is out with the client. */
  emailStatus: EmailStatus | null;
  /** False when sending now would put a deposit invoice out without how to pay. */
  hasPaymentDetails?: boolean;
  /** The site the client link lives on (APP_URL), the same one emails use. */
  appUrl: string;
};

const labelClass =
  "text-muted-foreground text-[11px] font-semibold tracking-[0.12em] uppercase";

const qty = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function ProposalDetailView({
  proposal,
  project,
  emailStatus,
  hasPaymentDetails = true,
  appUrl,
}: ProposalDetailViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const state = proposal.state;
  const config = proposalStateConfig[state];
  const live = state === "sent" || state === "viewed" || state === "expiring";
  const closed =
    state === "declined" || state === "revoked" || state === "expired";
  const proposalId = proposal.id;
  const currency = proposal.currency;
  const money = (value: string | number) =>
    formatCurrency(String(value), currency);
  const brand = resolveBrandColor(proposal.brandColor);

  const taxRate = Number(proposal.taxRate);
  const depositPercent = Number(proposal.depositPercent);
  const depositAmount = depositAmounts(
    proposal.subtotal,
    proposal.total,
    depositPercent,
  ).total;
  const clientPath = `/p/${proposal.token}`;
  const clientUrl = `${appUrl}${clientPath}`;
  const hasEmail = Boolean(proposal.client.email?.trim());
  // True until the daily limit lifts; re-enables the button without a refresh.
  const emailBlocked = useWithinWindow(emailStatus?.blocked?.until ?? null, 0);
  const emailReason = !hasEmail
    ? "Add an email address to this client first"
    : emailBlocked && emailStatus?.blocked
      ? emailStatus.blocked.reason
      : null;

  // Stages carry their lines; lines without a stage (older proposals) come last, unnamed.
  const stages = [
    ...proposal.milestones.map((stage) => ({
      ...stage,
      items: proposal.items.filter((item) => item.milestoneId === stage.id),
    })),
    ...(proposal.items.some((item) => !item.milestoneId)
      ? [
          {
            id: "ungrouped",
            name: null,
            description: null,
            timeframe: null,
            items: proposal.items.filter((item) => !item.milestoneId),
          },
        ]
      : []),
  ].filter((stage) => stage.items.length > 0 || stage.name);

  // ── Actions ──────────────────────────────────────────────────────────
  // An email can't be recalled, so Send asks first and names the recipient.
  const [confirmSend, setConfirmSend] = useState(false);
  const send = () => setConfirmSend(true);
  const sendNow = () =>
    runActionWithToast(sendProposalAction({ proposalId }), {
      loading: "Sending proposal...",
      success: ({ emailError }) =>
        emailError
          ? "Proposal sent - the link is live"
          : `Proposal emailed to ${proposal.client.email}`,
      onSuccess: ({ emailError }) => {
        warnNotEmailed(emailError, "proposal");
        router.refresh();
      },
    });

  const emailAgain = () =>
    startTransition(async () => {
      await runActionWithToast(emailProposalAction({ proposalId }), {
        loading: "Emailing the link...",
        success: `Link emailed again to ${proposal.client.email}`,
        onSuccess: () => router.refresh(),
      });
    });

  const copyLink = async () => {
    const url = clientUrl;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Client link copied");
    } catch {
      // Clipboard needs a secure context and permission; show the URL instead.
      toast.error("Could not copy automatically", { description: url });
    }
  };

  const startProject = () =>
    startTransition(async () => {
      await runActionWithToast(
        createProjectFromProposalAction({ proposalId }),
        {
          loading: "Starting project...",
          success: "Project started from the proposal",
          onSuccess: ({ projectId }) => router.push(`/projects/${projectId}`),
        },
      );
    });

  const duplicate = () =>
    startTransition(async () => {
      await runActionWithToast(duplicateProposalAction({ proposalId }), {
        loading: "Duplicating...",
        success: "Draft copy created",
        onSuccess: ({ proposalId: copyId }) =>
          router.push(`/proposals/${copyId}`),
      });
    });

  const button = (
    key: string,
    label: string,
    onClick: () => void,
    variant: "primary" | "secondary" | "ghost" = "secondary",
    disabledReason?: string | null,
  ) => (
    <CustomButton
      key={key}
      type="button"
      variant={variant}
      size="sm"
      onClick={onClick}
      disabled={isPending || Boolean(disabledReason)}
      title={disabledReason ?? undefined}
      className={cn(
        key === "delete" && "text-danger-600 hover:text-danger-600",
      )}
    >
      {label}
    </CustomButton>
  );
  // Side card: the next step (send a draft, copy a closed one). Header: the rest.
  // Copy, Email again and Revoke live in the client-link card.
  const duplicateAction = {
    label: "Duplicate proposal",
    onClick: duplicate,
    disabled: isPending,
    icon: <CopyPlusIcon className="size-4" />,
  };
  const cardActions: PageAction[] =
    state === "draft"
      ? [
          {
            label: "Send proposal",
            kind: "primary",
            onClick: send,
            disabled: isPending || !hasEmail,
            hint: hasEmail ? null : emailReason,
            icon: <SendIcon className="size-4" />,
          },
        ]
      : closed
        ? [{ ...duplicateAction, kind: "primary" }]
        : [];
  const headerActions: PageAction[] = [
    ...(state === "draft"
      ? [
          {
            label: "Edit proposal",
            kind: "quiet" as const,
            href: `/proposals/${proposalId}/edit`,
            icon: <PencilIcon className="size-4" />,
          },
        ]
      : []),
    ...(closed ? [] : [{ ...duplicateAction, kind: "quiet" as const }]),
    {
      label: "Delete proposal",
      kind: "danger",
      onClick: () => setConfirmDelete(true),
      disabled: isPending,
      icon: <Trash2Icon className="size-4" />,
    },
  ];

  // ── Rail content ─────────────────────────────────────────────────────
  const timeline: TimelineItem[] = [
    { title: "Created", detail: formatDate(proposal.createdAt) },
  ];
  if (proposal.sentAt) {
    timeline.push({
      title: `Link emailed to ${proposal.client.email || "your client"}`,
      detail: formatDate(proposal.sentAt),
      tone: "info",
    });
  }
  if (proposal.viewedAt) {
    timeline.push({
      title: `First viewed by ${proposal.client.name}`,
      detail: formatDate(proposal.viewedAt),
      tone: "warning",
    });
  }
  if (proposal.acceptedAt) {
    timeline.push({
      title: "Accepted",
      detail: formatDate(proposal.acceptedAt),
      tone: "success",
    });
  }
  if (project) {
    timeline.push({
      title: "Project created",
      detail: "From this proposal",
      tone: "info",
    });
  }
  if (proposal.rejectedAt) {
    timeline.push({
      title: "Declined",
      detail: formatDate(proposal.rejectedAt),
      tone: "danger",
    });
  }
  if (proposal.revokedAt) {
    timeline.push({
      title: "You revoked the link",
      detail: formatDate(proposal.revokedAt),
    });
  }
  if (state === "expired" && proposal.expiresAt) {
    timeline.push({
      title: "Link expired",
      detail: formatDate(proposal.expiresAt),
    });
  }
  if (state === "draft") {
    timeline.push({
      title: "Not sent yet",
      detail: "A client link is created when you send",
      upcoming: true,
    });
  }
  if (live) {
    timeline.push({
      title: "Waiting on a reply",
      detail: proposal.expiresAt
        ? `Link open until ${formatShortDate(proposal.expiresAt)}`
        : "Link never expires",
      upcoming: true,
    });
  }

  const issuer = proposal.issuer
    ? formatIssuer(proposal.issuer)
    : { title: "You", lines: [] };

  const linkBox = (
    <div className="bg-muted/40 flex min-w-0 items-center gap-2 rounded-lg border px-2.5 py-2 font-mono text-xs">
      <span className="min-w-0 flex-1 truncate">
        {clientUrl.replace(/^https?:\/\//, "")}
      </span>
    </div>
  );

  return (
    <>
      <PageHeader
        title={proposal.title}
        actions={<HeaderActions actions={headerActions} />}
        mobileActions="inline"
        mobileMenu={<MoreMenu actions={headerActions} />}
        badge={
          <StatusBadge status={config.tone} variant="soft">
            {config.label}
          </StatusBadge>
        }
        subtitle={`${proposal.client.name} · ${proposal.sentAt ? `Sent ${formatShortDate(proposal.sentAt)}` : state === "draft" ? "Not sent" : "Sent"}`}
        backHref="/proposals"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Proposals", href: "/proposals" },
          { label: proposal.title },
        ]}

      />

      <div className="@container px-2 py-5 sm:px-3 md:px-5 lg:px-10">
        <div className="flex flex-col gap-4">
          {state === "draft" && depositPercent > 0 && !hasPaymentDetails && (
            <DepositPaymentWarning />
          )}
          {state === "accepted" && (
            <div className="bg-success-600/12 text-success-600 flex flex-wrap items-center justify-between gap-3 rounded-lg px-4 py-3.5 text-[13.5px]">
              <span>
                Accepted by {proposal.client.name}
                {proposal.acceptedAt &&
                  ` on ${formatShortDate(proposal.acceptedAt)}`}
                .{project ? " The project is set up." : " No project yet."}
              </span>
              {project ? (
                <Link
                  href={`/projects/${project.id}`}
                  className={customButtonClasses("secondary", "sm")}
                >
                  View project
                </Link>
              ) : (
                button("start-banner", "Start project", startProject)
              )}
            </div>
          )}
          {state === "declined" && (
            <div className="bg-danger-600/12 text-danger-600 rounded-lg px-4 py-3.5 text-[13.5px]">
              <p className="font-semibold">
                Declined
                {proposal.rejectedAt &&
                  ` ${formatShortDate(proposal.rejectedAt)}`}
                .
              </p>
              <p className="mt-1">
                &ldquo;{proposal.declineReason || "No reason given"}&rdquo;
              </p>
            </div>
          )}

          <div className="grid items-start gap-5 @[1000px]:grid-cols-[minmax(0,1fr)_21.25rem]">
            {/* ── The document, as the client sees it ───────────────── */}
            <article
              aria-label="Proposal"
              className="bg-card order-2 min-w-0 overflow-hidden rounded-lg border shadow-xs @[1000px]:order-none"
            >
              <div className="h-1" style={{ background: brand }} />
              <div className="flex flex-col gap-6 p-5 @[560px]:p-8">
                <div className="flex min-w-0 items-center gap-3">
                  {proposal.logoSrc ? (
                    <BrandLogo
                      src={proposal.logoSrc}
                      name={issuer.title}
                      className="h-10"
                    />
                  ) : (
                    <AvatarInitials
                      name={issuer.title}
                      shape="square"
                      variant="accent"
                      className="shrink-0"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold wrap-anywhere">
                      {issuer.title}
                    </p>
                    {issuer.lines.length > 0 && (
                      <p className="text-muted-foreground text-[12.5px] wrap-anywhere">
                        {issuer.lines.slice(0, 2).join(" · ")}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <p
                    className="text-[11px] font-semibold tracking-[0.12em] uppercase"
                    style={{ color: brand }}
                  >
                    Proposal
                  </p>
                  <h2 className="font-space mt-1.5 text-[22px] leading-tight font-semibold tracking-tight text-balance @[560px]:text-[30px]">
                    {proposal.title}
                  </h2>
                  <p className="text-muted-foreground mt-2 text-sm">
                    Prepared for{" "}
                    {proposal.client.company || proposal.client.name} ·{" "}
                    {formatDate(proposal.createdAt)}
                  </p>
                </div>

                {proposal.content?.trim() && (
                  <div>
                    <p className={labelClass}>Summary</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-pretty whitespace-pre-line">
                      {proposal.content}
                    </p>
                  </div>
                )}

                {stages.map((stage) => {
                  const subtotal = stage.items.reduce(
                    (sum, item) => sum + Number(item.amount),
                    0,
                  );
                  return (
                    <section key={stage.id}>
                      {stage.name && (
                        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-4">
                          <h3 className="font-space text-base font-semibold">
                            {stage.name}
                          </h3>
                          {stage.timeframe && (
                            <span className="text-muted-foreground text-[13px]">
                              {stage.timeframe}
                            </span>
                          )}
                        </div>
                      )}
                      {stage.description && (
                        <p className="text-muted-foreground mb-2 text-[13.5px] text-pretty whitespace-pre-line">
                          {stage.description}
                        </p>
                      )}
                      <table className="w-full table-fixed border-collapse text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className={cn(labelClass, "py-2 text-left")}>
                              Description
                            </th>
                            <th
                              className={cn(
                                labelClass,
                                "hidden w-16 py-2 text-right @[560px]:table-cell",
                              )}
                            >
                              Qty
                            </th>
                            <th
                              className={cn(
                                labelClass,
                                "hidden w-26 py-2 text-right @[560px]:table-cell",
                              )}
                            >
                              Rate
                            </th>
                            <th
                              className={cn(labelClass, "w-26 py-2 text-right")}
                            >
                              Amount
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {stage.items.map((item) => (
                            <tr key={item.id} className="border-b">
                              <td className="py-2.5 pr-3 align-top wrap-anywhere">
                                {item.description}
                                <span className="text-muted-foreground block text-xs @[560px]:hidden">
                                  {qty.format(Number(item.quantity))} ×{" "}
                                  {money(item.rate)}
                                </span>
                              </td>
                              <td className="font-space hidden py-2.5 text-right align-top tabular-nums @[560px]:table-cell">
                                {qty.format(Number(item.quantity))}
                              </td>
                              <td className="font-space hidden py-2.5 text-right align-top tabular-nums @[560px]:table-cell">
                                {money(item.rate)}
                              </td>
                              <td className="font-space py-2.5 text-right align-top font-medium tabular-nums">
                                {money(item.amount)}
                              </td>
                            </tr>
                          ))}
                          {stage.name && (
                            <tr>
                              <td
                                colSpan={4}
                                className="text-muted-foreground pt-2 text-right text-[13px]"
                              >
                                Stage subtotal{" "}
                                <span className="font-space text-foreground font-medium tabular-nums">
                                  {money(subtotal)}
                                </span>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </section>
                  );
                })}

                <dl className="ml-auto w-full max-w-80 text-[13.5px]">
                  <div className="flex justify-between gap-6 py-1">
                    <dt className="text-muted-foreground">Subtotal</dt>
                    <dd className="font-space tabular-nums">
                      {money(proposal.subtotal)}
                    </dd>
                  </div>
                  {taxRate > 0 && (
                    <div className="flex justify-between gap-6 py-1">
                      <dt className="text-muted-foreground">
                        Tax ({formatPercent(taxRate)}%)
                      </dt>
                      <dd className="font-space tabular-nums">
                        {money(proposal.tax)}
                      </dd>
                    </div>
                  )}
                  <div className="mt-1.5 flex items-baseline justify-between gap-6 border-t pt-2.5 font-semibold">
                    <dt>Total</dt>
                    <dd className="font-space text-xl font-medium tabular-nums">
                      {money(proposal.total)}
                    </dd>
                  </div>
                  {depositPercent > 0 && (
                    <div
                      className="flex justify-between gap-6 pt-2 font-medium"
                      style={{ color: brand }}
                    >
                      <dt>
                        Deposit to begin ({formatPercent(depositPercent)}%)
                      </dt>
                      <dd className="font-space tabular-nums">
                        {money(depositAmount)}
                      </dd>
                    </div>
                  )}
                  {proposal.deliveryDays ? (
                    <div className="text-muted-foreground flex justify-between gap-6 pt-1">
                      <dt>Delivery time</dt>
                      <dd>{plural(proposal.deliveryDays, "day")}</dd>
                    </div>
                  ) : null}
                </dl>
              </div>
            </article>

            {/* ── The rail (first on narrow screens) ─────────────────── */}
            <aside className="order-1 flex min-w-0 flex-col gap-4 @[1000px]:sticky @[1000px]:top-4 @[1000px]:order-none">
              <DetailCard>
                <p className="text-muted-foreground text-[12.5px]">Value</p>
                <p className="font-space mt-0.5 text-[32px] leading-tight font-medium tracking-tight tabular-nums">
                  {money(proposal.total)}
                </p>
                <p className="text-muted-foreground mt-1 text-[13px]">
                  {/* No day counts here (they'd read the clock in render): dates only. */}
                  {proposalActivity(state, {
                    ...proposal,
                    daysSinceUpdate: Number.POSITIVE_INFINITY,
                    daysSinceViewed: Number.POSITIVE_INFINITY,
                  })}
                </p>
                {cardActions.length > 0 && (
                  <CardActions
                    actions={cardActions}
                    className="mt-4"
                    hideOnPhone={false}
                  />
                )}
              </DetailCard>

              <DetailCard title="Client link">
                {state === "draft" ? (
                  <p className="text-muted-foreground text-[13.5px]">
                    A private link is created when you send this proposal.
                  </p>
                ) : closed ? (
                  <p className="text-muted-foreground text-[13.5px]">
                    {state === "declined"
                      ? "Declined, so the link is closed. Duplicate it to send a new version."
                      : state === "revoked"
                        ? "You revoked this link, so it no longer opens."
                        : "This link expired before your client replied."}
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {linkBox}
                    <div className="flex flex-wrap gap-2">
                      <CustomButton
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={copyLink}
                        className="gap-1.5"
                      >
                        <CopyIcon className="size-3.5" />
                        Copy client link
                      </CustomButton>
                      <a
                        href={clientPath}
                        target="_blank"
                        rel="noreferrer"
                        className={customButtonClasses(
                          "ghost",
                          "sm",
                          "gap-1.5",
                        )}
                      >
                        <ExternalLinkIcon className="size-3.5" />
                        Open client page
                      </a>
                    </div>
                    {live && (
                      <>
                        <CustomButton
                          type="button"
                          onClick={emailAgain}
                          disabled={isPending || Boolean(emailReason)}
                          className="mt-1 w-full"
                        >
                          Email link again
                        </CustomButton>
                        <p className="text-muted-foreground text-center text-xs">
                          {emailReason ??
                            `${emailStatus?.remaining ?? 0} of ${EMAIL_LIMITS.perDocumentPerDay} emails left today`}
                        </p>
                      </>
                    )}
                    <p
                      className={cn(
                        "text-[12.5px]",
                        state === "expiring"
                          ? "text-warning-600"
                          : "text-muted-foreground",
                      )}
                    >
                      {state === "accepted"
                        ? "Your client can still open it to see what they agreed."
                        : proposal.expiresAt
                          ? `Link expires ${formatDate(proposal.expiresAt)}. Extending a link is coming later.`
                          : "This link never expires."}
                    </p>
                    {live && (
                      <button
                        type="button"
                        onClick={() => setConfirmRevoke(true)}
                        disabled={isPending}
                        className="text-danger-600 self-start text-[12.5px] font-medium hover:underline disabled:opacity-60"
                      >
                        Revoke link
                      </button>
                    )}
                  </div>
                )}
              </DetailCard>

              <DetailCard title="Activity">
                <Timeline items={timeline} />
              </DetailCard>
            </aside>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmSend}
        onOpenChange={setConfirmSend}
        title="Send this proposal?"
        description={proposalSendDescription(
          proposal.title,
          proposal.client.email ?? proposal.client.name,
          depositPercent > 0 && !hasPaymentDetails ? DEPOSIT_NO_PAYMENT : null,
        )}
        confirmLabel="Send proposal"
        pendingLabel="Sending..."
        onConfirm={sendNow}
      />

      <ConfirmDialog
        open={confirmRevoke}
        onOpenChange={setConfirmRevoke}
        title="Revoke the client link?"
        description="Your client won't be able to open or accept this proposal any more."
        confirmLabel="Revoke link"
        pendingLabel="Revoking..."
        variant="destructive"
        onConfirm={async () => {
          await runActionWithToast(revokeProposalAction({ proposalId }), {
            loading: "Revoking link...",
            success: "Link revoked",
            onSuccess: () => router.refresh(),
          });
        }}
      />

      <DeleteDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete "${proposal.title}"?`}
        description={
          state === "accepted"
            ? "This removes your record of what was agreed. A project created from it is kept."
            : "The proposal and its client link are removed for good."
        }
        onDelete={async () => {
          await runActionWithToast(deleteProposalAction({ proposalId }), {
            loading: "Deleting proposal...",
            success: "Proposal deleted",
            onSuccess: () => router.push("/proposals"),
            onError: (error) => {
              throw error;
            },
          });
        }}
      />
    </>
  );
}
