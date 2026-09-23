"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BellIcon,
  CheckIcon,
  DownloadIcon,
  PencilIcon,
  SendIcon,
  Trash2Icon,
  Undo2Icon,
} from "lucide-react";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { DeleteDialog } from "@/components/delete-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { runActionWithToast } from "@/lib/run-action-with-toast";
import { formatCurrency, formatNumber } from "@/lib/format-currency";
import { formatDate } from "@/lib/format-date";
import { formatInvoiceNumber } from "@/lib/format-invoice-number";
import {
  formatLineItemQuantity,
  formatLineItemRate,
} from "@/lib/format-line-item";
import { getDisplayStatus } from "@/lib/get-invoice-display-status";
import { isReminderOnCooldown } from "@/lib/is-reminder-on-cooldown";
import { useWithinWindow } from "@/hooks/use-within-window";
import { useUndoableAction } from "@/hooks/use-undoable-action";
import { UNDO_SEND_WINDOW_MS } from "@/lib/is-within-undo-send-window";
import { REMINDER_SEND_DELAY_MS } from "@/lib/reminder-send-delay";
import { cn } from "@/lib/utils";
import PageHeader from "@/components/dashboard/page-header";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import type { ActionResult } from "@/lib/action-result";
import type { ClientRow } from "@/src/db/schema/clients";
import type { invoices } from "@/src/db/schema/invoices";
import type { invoiceItems } from "@/src/db/schema/invoice-items";
import type { ProjectListItem } from "../../projects/queries";
import { clientStatusConfig } from "../../clients/client-status-config";
import { projectStatusConfig } from "../../projects/project-status-config";
import { invoiceStatusConfig } from "../invoice-status-config";
import { getInvoiceDueLabel } from "../invoice-due-label";
import {
  deleteInvoiceAction,
  markInvoicePaidAction,
  sendInvoiceAction,
  sendReminderAction,
  updateInvoiceStatusAction,
} from "../actions";
import { InvoiceTimeline } from "./invoice-timeline";

type InvoiceRow = typeof invoices.$inferSelect;
type InvoiceItemRow = typeof invoiceItems.$inferSelect;

type InvoiceDetailProps = {
  invoice: InvoiceRow & {
    lineItems: InvoiceItemRow[];
    /** Whole days until dueDate, negative once past — see getInvoiceById(). */
    daysUntilDue: number;
    /** The freelancer issuing this invoice, for the "From" block — only what
     * actually exists on `users` today (no business name/address field). */
    issuer: {
      name: string | null;
      email: string;
      profession: string | null;
    } | null;
  };
  client: ClientRow | null;
  project: ProjectListItem | null;
};

// ─── Design primitives ─────────────────────────────────────────────────────
// Every size, weight and tint below comes from the Claude Design mockup for
// this page. Container queries (not viewport breakpoints) because the app
// sidebar changes the page's real width: 560px = phone → roomy padding,
// 900px = rail moves beside the document, 1180px = wider rail + doc padding.

/** Small-caps section label used across the document and the rail. */
const labelClass =
  "text-muted-foreground text-[10.5px] font-semibold tracking-[0.14em] uppercase";

/** A slightly stronger hairline than --border, for structural rules. */
const ruleClass = "border-foreground/12";

// Ink colour per status tone — the same tones the header's StatusBadge uses,
// so the stamp and the badge always agree.
const stampInk: Record<StatusTone, string> = {
  neutral: "text-ink-600 dark:text-ink-400",
  info: "text-ledger-600 dark:text-ledger-500",
  success: "text-success-600",
  warning: "text-warning-600",
  danger: "text-danger-600",
};

/**
 * Rubber-stamp status mark on the document itself: double-ruled border,
 * slight tilt, faint ink wash. Decorative only — the status is also in the
 * page header — so it ignores pointer events and exposes one aria-label.
 */
function StatusStamp({
  tone,
  label,
  detail,
}: {
  tone: StatusTone;
  label: string;
  detail: string | null;
}) {
  return (
    <div
      role="img"
      aria-label={`Invoice status: ${label}${detail ? `, ${detail}` : ""}`}
      className={cn(
        "pointer-events-none inline-flex shrink-0 -rotate-6 flex-col items-center rounded-md border-3 border-double border-current bg-current/5 px-4 py-2 opacity-90 select-none",
        stampInk[tone],
      )}
    >
      {/* Negative right margin cancels the trailing letter-spacing so the
          word sits optically centred inside the border. */}
      <span className="font-space mr-[-0.2em] text-[22px] leading-none font-bold tracking-[0.2em] uppercase">
        {label}
      </span>
      {detail && (
        <span
          className="mt-1.5 border-t border-current/40 pt-1 font-mono text-[10.5px] tracking-[0.08em] uppercase"
          suppressHydrationWarning
        >
          {detail}
        </span>
      )}
    </div>
  );
}

type ActionKind = "primary" | "secondary" | "quiet" | "danger";

// One full class set per kind — nothing shared that a kind then overrides, so
// no two utilities ever fight over the same property. `enabled:` keeps hover
// feedback off disabled buttons.
const actionClasses: Record<ActionKind, string> = {
  primary:
    "border-primary bg-primary text-primary-foreground py-2.5 text-[13.5px] font-medium enabled:hover:opacity-90 [a&]:hover:opacity-90",
  secondary:
    "border-border bg-card text-foreground py-2.5 text-[13.5px] font-medium enabled:hover:bg-secondary [a&]:hover:bg-secondary",
  quiet:
    "text-muted-foreground border-transparent bg-transparent py-2 text-[13px] font-normal enabled:hover:bg-secondary enabled:hover:text-foreground [a&]:hover:bg-secondary [a&]:hover:text-foreground",
  danger:
    "text-destructive border-transparent bg-transparent py-2 text-[13px] font-medium enabled:hover:bg-danger-100 dark:enabled:hover:bg-danger-600/15",
};

function actionClass(kind: ActionKind) {
  return cn(
    "flex w-full cursor-pointer items-center justify-center gap-2 rounded-sm border px-3.5 transition-colors",
    "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
    "disabled:cursor-not-allowed disabled:opacity-60",
    actionClasses[kind],
  );
}

function RailCard({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="bg-card border-border min-w-0 rounded-lg border p-4.5">
      <div className="mb-3.5 flex items-center justify-between gap-2.5">
        <h2 className={labelClass}>{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export function InvoiceDetail({
  invoice,
  client,
  project,
}: InvoiceDetailProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const displayStatus = getDisplayStatus(invoice);
  const statusInfo = invoiceStatusConfig[displayStatus];
  const invoiceNumber = formatInvoiceNumber(invoice.invoiceNumber);

  const isDraft = displayStatus === "draft";
  const isSent = displayStatus === "sent";
  const isOverdue = displayStatus === "overdue";
  const isPaid = displayStatus === "paid";
  const isOutstanding = isSent || isOverdue;

  const reminderOnCooldown = isReminderOnCooldown(invoice.lastReminderSentAt);
  const canUndoSend = useWithinWindow(invoice.sentAt, UNDO_SEND_WINDOW_MS);
  const dueLabel = getInvoiceDueLabel({
    status: displayStatus,
    daysUntilDue: invoice.daysUntilDue,
    paidAt: invoice.paidAt,
  });

  const run = (
    action: () => Promise<ActionResult>,
    messages: { loading: string; success: string },
  ) =>
    startTransition(async () => {
      await runActionWithToast(action(), {
        loading: messages.loading,
        success: messages.success,
        onSuccess: () => router.refresh(),
      });
    });

  const { trigger: sendReminder, isQueued: isReminderQueued } =
    useUndoableAction(
      () => sendReminderAction(invoice.id),
      {
        queued: "Reminder will be sent shortly.",
        loading: "Sending reminder...",
        success: "Reminder sent.",
      },
      REMINDER_SEND_DELAY_MS,
      { onSuccess: () => router.refresh() },
    );

  const clientStatus = client ? clientStatusConfig[client.status] : null;
  const projectStatus = project ? projectStatusConfig[project.status] : null;

  // Second line of the status stamp: when it was paid, or how the due date
  // stands ("Due in 9 days" / "20 days late").
  const stampDetail = isPaid
    ? invoice.paidAt
      ? formatDate(invoice.paidAt)
      : null
    : isDraft
      ? "Not sent"
      : dueLabel.label;

  const issuerName = invoice.issuer?.name ?? invoice.issuer?.email ?? "You";
  const clientCompany =
    client?.company && client.company !== client.name ? client.company : null;

  const reminderReason = reminderOnCooldown
    ? "Reminder already sent today"
    : isReminderQueued
      ? "Reminder queued — click the toast to undo"
      : null;

  const reminderButton = (
    <button
      type="button"
      className={actionClass("secondary")}
      disabled={isPending || Boolean(reminderReason)}
      onClick={sendReminder}
    >
      <BellIcon className="size-3.5" /> Send reminder
    </button>
  );

  const undoSendButton = (
    <button
      type="button"
      className={actionClass("quiet")}
      disabled={isPending || !canUndoSend}
      onClick={() =>
        run(
          () =>
            updateInvoiceStatusAction({
              invoiceId: invoice.id,
              status: "draft",
            }),
          {
            loading: "Reverting to draft...",
            success: "Invoice moved back to draft.",
          },
        )
      }
    >
      <Undo2Icon className="size-3.5" /> Revert to draft
    </button>
  );

  return (
    <div className="@container">
      <PageHeader
        title={`Invoice ${invoiceNumber}`}
        subtitle={client?.name ?? "Unknown client"}
        badge={
          <StatusBadge
            status={statusInfo.variant}
            className={statusInfo.dim ? "opacity-60" : undefined}
          >
            {statusInfo.label}
          </StatusBadge>
        }
        backHref="/invoices"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Invoices", href: "/invoices" },
          { label: invoiceNumber },
        ]}
      />

      <div className="px-4 pt-5 pb-7 @[560px]:px-8 @[560px]:pt-7 @[560px]:pb-10">
        <div className="grid items-start gap-6 @[900px]:grid-cols-[minmax(0,1fr)_312px] @[1180px]:grid-cols-[minmax(0,1fr)_360px]">
          {/* ─── The document ─────────────────────────────────────────── */}
          <article className="bg-card border-border min-w-0 rounded-lg border px-4.5 py-5.5 @[560px]:p-8 @[1180px]:p-10">
            <header
              className={cn(
                "flex flex-wrap items-start justify-between gap-5 border-b-2 pb-7",
                ruleClass,
              )}
            >
              <div>
                <p className="font-space text-muted-foreground text-[11px] font-bold tracking-[0.22em] uppercase">
                  Invoice
                </p>
                <p className="mt-1.5 font-mono text-[22px] font-semibold tracking-[-0.01em]">
                  {invoiceNumber}
                </p>
              </div>
              <div className="text-muted-foreground text-right text-[13px] leading-[1.9]">
                <p>
                  Issue date{" "}
                  <span className="text-foreground font-mono">
                    {formatDate(invoice.issueDate)}
                  </span>
                </p>
                <p>
                  Due date{" "}
                  <span className="text-foreground font-mono">
                    {formatDate(invoice.dueDate)}
                  </span>
                </p>
              </div>
            </header>

            {/* Parties */}
            <section
              className={cn(
                "grid gap-x-10 gap-y-7 border-b py-7 @[560px]:grid-cols-[repeat(auto-fit,minmax(190px,1fr))]",
                ruleClass,
              )}
            >
              <div className="min-w-0">
                <h2 className={cn(labelClass, "mb-2.5")}>From</h2>
                <p className="text-[14.5px] leading-[1.45] font-semibold wrap-anywhere">
                  {issuerName}
                </p>
                <div className="text-muted-foreground mt-1 text-[13.5px] leading-[1.65] wrap-anywhere">
                  {invoice.issuer?.profession && (
                    <p>{invoice.issuer.profession}</p>
                  )}
                  {invoice.issuer?.name && <p>{invoice.issuer.email}</p>}
                </div>
              </div>

              <div className="min-w-0">
                <h2 className={cn(labelClass, "mb-2.5")}>Bill to</h2>
                <p className="text-[14.5px] leading-[1.45] font-semibold wrap-anywhere">
                  {client?.name ?? "Unknown client"}
                </p>
                <div className="text-muted-foreground mt-1 text-[13.5px] leading-[1.65] wrap-anywhere">
                  {clientCompany && <p>{clientCompany}</p>}
                  {client?.email && <p>{client.email}</p>}
                  {client?.country && <p>{client.country}</p>}
                </div>
              </div>

              {project && (
                <div className="min-w-0">
                  <h2 className={cn(labelClass, "mb-2.5")}>Project</h2>
                  <p className="text-[14.5px] leading-[1.45] font-semibold wrap-anywhere">
                    {project.title}
                  </p>
                  <p className="text-muted-foreground mt-1 text-[13.5px] leading-[1.65]">
                    {project.deadline
                      ? `${formatDate(project.createdAt)} - ${formatDate(project.deadline)}`
                      : projectStatus?.label}
                  </p>
                </div>
              )}
            </section>

            {/* Line items + totals */}
            <section className="pt-2">
              <table className="w-full table-fixed border-collapse">
                <thead>
                  <tr>
                    <th
                      className={cn(
                        labelClass,
                        "border-b py-3.5 text-left",
                        ruleClass,
                      )}
                    >
                      Description
                    </th>
                    <th
                      className={cn(
                        labelClass,
                        // Wide enough for "12.5 hrs" once there's room.
                        "w-14 border-b py-3.5 pl-3 text-right @[560px]:w-22",
                        ruleClass,
                      )}
                    >
                      Qty
                    </th>
                    <th
                      className={cn(
                        labelClass,
                        "w-21 border-b py-3.5 pl-3 text-right @[560px]:w-30",
                        ruleClass,
                      )}
                    >
                      Rate
                    </th>
                    <th
                      className={cn(
                        labelClass,
                        "w-24 border-b py-3.5 pl-3 text-right @[560px]:w-31",
                        ruleClass,
                      )}
                    >
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.lineItems.map((item) => (
                    <tr key={item.id} className="border-border border-b">
                      <td className="py-3.5 pr-4 align-top text-sm leading-[1.55] wrap-anywhere">
                        {item.description}
                      </td>
                      <td className="text-muted-foreground py-3.5 pl-3 text-right align-top font-mono text-[13.5px] tabular-nums">
                        {formatLineItemQuantity(item.quantity, item.unit)}
                      </td>
                      <td className="text-muted-foreground py-3.5 pl-3 text-right align-top font-mono text-[13.5px] tabular-nums">
                        {formatLineItemRate(item.rate, item.unit)}
                      </td>
                      <td className="py-3.5 pl-3 text-right align-top font-mono text-[13.5px] tabular-nums">
                        {formatCurrency(item.amount, invoice.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Stamp sits in the empty space left of the totals; on a phone
                  it drops below them so it never covers a figure. */}
              <div className="flex flex-col-reverse gap-6 pt-5 @[560px]:flex-row @[560px]:items-center @[560px]:justify-between">
                <div className="flex justify-center @[560px]:pl-2">
                  <StatusStamp
                    tone={statusInfo.variant}
                    label={statusInfo.label}
                    detail={stampDetail}
                  />
                </div>
                <div className="w-full @[560px]:max-w-80">
                  <div className="text-muted-foreground flex justify-between gap-6 py-1.75 text-[13.5px]">
                    <span>Subtotal</span>
                    <span className="text-foreground font-mono tabular-nums">
                      {formatCurrency(invoice.subTotal, invoice.currency)}
                    </span>
                  </div>
                  <div
                    className={cn(
                      "text-muted-foreground flex justify-between gap-6 border-b-2 pt-1.75 pb-3.5 text-[13.5px]",
                      ruleClass,
                    )}
                  >
                    <span>Tax ({formatNumber(Number(invoice.taxRate))}%)</span>
                    <span className="text-foreground font-mono tabular-nums">
                      {formatCurrency(invoice.taxAmount, invoice.currency)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-6 pt-4">
                    <span className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase">
                      Total due
                    </span>
                    <span className="font-mono text-[34px] leading-none font-semibold tracking-tight tabular-nums">
                      {formatCurrency(invoice.total, invoice.currency)}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Footer — payment details (invoice notes aren't stored yet) */}
            <section
              className={cn(
                "mt-8 grid gap-x-10 gap-y-7 border-t pt-6.5 @[560px]:grid-cols-2",
                ruleClass,
              )}
            >
              <div className="min-w-0">
                <h2 className={cn(labelClass, "mb-2.5")}>Payment details</h2>
                {invoice.paymentDetails ? (
                  <div className="text-[13.5px] leading-[1.85]">
                    <p className="wrap-anywhere whitespace-pre-line">
                      {invoice.paymentDetails}
                    </p>
                    <p className="text-muted-foreground mt-2 text-[12.5px]">
                      Reference: {invoiceNumber}
                    </p>
                  </div>
                ) : (
                  <div
                    className={cn(
                      "text-muted-foreground rounded-sm border border-dashed px-4 py-3.5 text-[13px] leading-[1.6]",
                      ruleClass,
                    )}
                  >
                    No payment details on this invoice — your client won&rsquo;t
                    know where to send the money.{" "}
                    {!isPaid && (
                      <Link
                        href={`/invoices/${invoice.id}/edit`}
                        className="text-primary font-medium hover:underline"
                      >
                        Add them
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </section>
          </article>

          {/* ─── The rail ─────────────────────────────────────────────── */}
          <aside className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(248px,1fr))] content-start gap-4 @[900px]:sticky @[900px]:top-5 @[900px]:grid-cols-1">
            <RailCard
              title="Client"
              aside={
                clientStatus && (
                  <StatusBadge
                    status={clientStatus.variant}
                    variant="soft"
                    size="sm"
                    className={clientStatus.dim ? "opacity-60" : undefined}
                  >
                    {clientStatus.label}
                  </StatusBadge>
                )
              }
            >
              {client ? (
                <div className="flex min-w-0 items-start gap-3">
                  <AvatarInitials
                    name={client.name}
                    variant="accent"
                    shape="circle"
                  />
                  <div className="min-w-0">
                    <Link
                      href={`/clients/${client.id}`}
                      className="text-foreground block text-[14.5px] leading-[1.35] font-semibold wrap-anywhere hover:underline"
                    >
                      {client.name}
                    </Link>
                    {client.email && (
                      <p className="text-muted-foreground mt-0.75 text-[12.5px] wrap-anywhere">
                        {client.email}
                      </p>
                    )}
                    {clientCompany && (
                      <p className="text-muted-foreground mt-px text-[12.5px] wrap-anywhere">
                        {clientCompany}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-[13px]">
                  This client has been removed.
                </p>
              )}
            </RailCard>

            <RailCard
              title="Project"
              aside={
                projectStatus && (
                  <StatusBadge
                    status={projectStatus.variant}
                    variant="soft"
                    size="sm"
                    className={projectStatus.dim ? "opacity-60" : undefined}
                  >
                    {projectStatus.label}
                  </StatusBadge>
                )
              }
            >
              {project ? (
                <div className="min-w-0">
                  <Link
                    href={`/projects/${project.id}`}
                    className="text-foreground block text-[14.5px] leading-[1.35] font-semibold wrap-anywhere hover:underline"
                  >
                    {project.title}
                  </Link>
                  <div className="text-muted-foreground mt-3.5 flex items-baseline justify-between text-[12.5px]">
                    <span>
                      {project.totalMilestones === 0
                        ? "No milestones yet"
                        : `${project.completedMilestones} of ${project.totalMilestones} milestones`}
                    </span>
                    <span className="text-foreground font-mono tabular-nums">
                      {project.progress}%
                    </span>
                  </div>
                  <div
                    className="bg-secondary mt-1.75 h-1.5 overflow-hidden rounded-sm"
                    role="progressbar"
                    aria-valuenow={project.progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Project progress"
                  >
                    <div
                      className="bg-primary h-full rounded-sm"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div
                  className={cn(
                    "rounded-sm border border-dashed p-4",
                    ruleClass,
                  )}
                >
                  <p className="text-[13.5px] leading-[1.4] font-medium">
                    No project linked
                  </p>
                  <p className="text-muted-foreground mt-1 text-[12.5px] leading-[1.55]">
                    This invoice stands on its own. Link it to a project to
                    track it against milestones.
                  </p>
                  {!isPaid && (
                    <Link
                      href={`/invoices/${invoice.id}/edit`}
                      className="border-border hover:bg-secondary mt-3 inline-block rounded-sm border px-2.75 py-1.75 text-[12.5px] font-medium"
                    >
                      Link a project
                    </Link>
                  )}
                </div>
              )}
            </RailCard>

            <RailCard title="Timeline">
              <InvoiceTimeline
                createdAt={invoice.createdAt}
                sentAt={invoice.sentAt}
                lastReminderSentAt={invoice.lastReminderSentAt}
                paidAt={invoice.paidAt}
                displayStatus={displayStatus}
                overdueDetail={dueLabel.label}
              />
            </RailCard>

            <RailCard title="Quick actions">
              <div className="grid gap-2">
                {/* Primary — the one step that moves this invoice forward */}
                {isDraft && (
                  <button
                    type="button"
                    className={actionClass("primary")}
                    disabled={isPending}
                    onClick={() =>
                      run(() => sendInvoiceAction(invoice.id), {
                        loading: "Sending invoice...",
                        success: "Invoice sent.",
                      })
                    }
                  >
                    <SendIcon className="size-3.5" /> Send invoice
                  </button>
                )}
                {isOutstanding && (
                  <button
                    type="button"
                    className={actionClass("primary")}
                    disabled={isPending}
                    onClick={() =>
                      run(() => markInvoicePaidAction(invoice.id), {
                        loading: "Marking as paid...",
                        success: "Invoice marked as paid.",
                      })
                    }
                  >
                    <CheckIcon className="size-3.5" /> Mark as paid
                  </button>
                )}

                {/* Secondary */}
                {isDraft && (
                  <Link
                    href={`/invoices/${invoice.id}/edit`}
                    className={actionClass("secondary")}
                  >
                    <PencilIcon className="size-3.5" /> Edit invoice
                  </Link>
                )}
                {isOutstanding &&
                  (reminderReason ? (
                    <Tooltip>
                      {/* span: a disabled button fires no pointer events,
                          so the tooltip needs a wrapper to hover. */}
                      <TooltipTrigger asChild>
                        <span className="block">{reminderButton}</span>
                      </TooltipTrigger>
                      <TooltipContent>{reminderReason}</TooltipContent>
                    </Tooltip>
                  ) : (
                    reminderButton
                  ))}

                <a
                  href={`/api/invoices/${invoice.id}/pdf`}
                  download
                  className={actionClass("secondary")}
                >
                  <DownloadIcon className="size-3.5" /> Download PDF
                </a>

                {/* Quiet */}
                {isOutstanding && (
                  <Link
                    href={`/invoices/${invoice.id}/edit`}
                    className={actionClass("quiet")}
                  >
                    <PencilIcon className="size-3.5" /> Edit invoice
                  </Link>
                )}
                {isSent &&
                  (canUndoSend ? (
                    undoSendButton
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="block">{undoSendButton}</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        The 5-minute undo window has passed
                      </TooltipContent>
                    </Tooltip>
                  ))}
                {isPaid && (
                  <button
                    type="button"
                    className={actionClass("quiet")}
                    disabled={isPending}
                    onClick={() =>
                      run(
                        () =>
                          updateInvoiceStatusAction({
                            invoiceId: invoice.id,
                            status: "sent",
                          }),
                        {
                          loading: "Reverting to sent...",
                          success: "Invoice moved back to sent.",
                        },
                      )
                    }
                  >
                    <Undo2Icon className="size-3.5" /> Revert to sent
                  </button>
                )}
              </div>

              <div className={cn("mt-3.5 border-t pt-3.5", ruleClass)}>
                <button
                  type="button"
                  className={actionClass("danger")}
                  disabled={isPending}
                  onClick={() => setIsDeleteOpen(true)}
                >
                  <Trash2Icon className="size-3.5" /> Delete invoice
                </button>
              </div>
            </RailCard>
          </aside>
        </div>
      </div>

      <DeleteDialog
        title="Delete Invoice"
        description={`Are you sure you want to delete "${client?.name ?? "this"}'s invoice"? This can't be undone.`}
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onDelete={async () => {
          await runActionWithToast(deleteInvoiceAction(invoice.id), {
            loading: "Deleting Invoice",
            success: "Invoice deleted",
            onSuccess: () => router.push("/invoices"),
          });
        }}
      />
    </div>
  );
}
