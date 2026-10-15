"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BellIcon,
  CheckIcon,
  DownloadIcon,
  LinkIcon,
  SendIcon,
  PencilIcon,
  Trash2Icon,
  Undo2Icon,
} from "lucide-react";

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
import { DeleteDialog } from "@/components/delete-dialog";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import {
  CustomButton,
  customButtonClasses,
} from "@/components/ui/custom-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { useUndoableAction } from "@/hooks/use-undoable-action";
import { useWithinWindow } from "@/hooks/use-within-window";
import type { ActionResult } from "@/lib/action-result";
import type { EmailStatus } from "@/lib/email/quota";
import { EMAIL_LIMITS } from "@/lib/email/quota-rules";
import { warnNotEmailed } from "@/lib/email/warn-not-emailed";
import { formatCurrency, formatNumber } from "@/lib/format-currency";
import { formatDate } from "@/lib/format-date";
import { formatDayValue, formatShortDate } from "@/lib/format-due";
import { formatInvoiceNumber } from "@/lib/format-invoice-number";
import { formatIssuer } from "@/lib/format-issuer";
import {
  formatLineItemQuantity,
  formatLineItemRate,
} from "@/lib/format-line-item";
import { getDisplayStatus } from "@/lib/get-invoice-display-status";
import type { IssuerDetails } from "@/lib/issuer-snapshot";
import {
  formatPaymentMethod,
  hasPaymentDetails,
  type PaymentDetails,
} from "@/lib/payment-methods";
import type { BoardProject } from "@/lib/project-progress";
import { balanceRows, invoiceProjectBalance } from "@/lib/project-ledger";
import { REMINDER_SEND_DELAY_MS } from "@/lib/reminder-send-delay";
import { invoiceSendDescription } from "@/lib/send-confirm";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { runActionWithToast } from "@/lib/run-action-with-toast";
import { cn } from "@/lib/utils";
import type { ClientRow } from "@/src/db/schema/clients";
import type { invoiceItems } from "@/src/db/schema/invoice-items";
import type { invoices } from "@/src/db/schema/invoices";
import { clientStatusConfig } from "../../clients/client-status-config";
import { UPGRADE_HREF } from "@/components/dashboard/plan-limit-page";
import type { ProjectListItem } from "../../projects/queries";
import {
  clearPaymentClaimAction,
  deleteInvoiceAction,
  linkInvoiceProjectAction,
  markInvoicePaidAction,
  sendInvoiceAction,
  sendReminderAction,
  updateInvoiceStatusAction,
} from "../actions";
import {
  invoiceNote,
  invoiceState,
  invoiceStateConfig,
  type InvoiceState,
} from "../invoice-state";

type InvoiceRow = typeof invoices.$inferSelect;
type InvoiceItemRow = typeof invoiceItems.$inferSelect;

type InvoiceDetailProps = {
  invoice: InvoiceRow & {
    lineItems: InvoiceItemRow[];
    /** Whole days until dueDate, negative once past - see getInvoiceById(). */
    daysUntilDue: number;
    /** Paid invoices on the project created before this one. */
    paidBeforeOnProject: string;
    /** The snapshot once sent, live details while it's a draft. */
    issuer: IssuerDetails | null;
    payment: PaymentDetails;
    logoSrc: string | null;
    /** False on Free: the button points to the upgrade page instead. */
    canDownloadPdf: boolean;
  };
  client: ClientRow | null;
  project: (ProjectListItem & { board: BoardProject }) | null;
  /** This client's projects, offered when no project is linked. */
  clientProjects: { id: string; title: string }[];
  emailStatus: EmailStatus;
  reminders: Date[];
};

/** Small-caps label used inside the document. */
const labelClass =
  "text-muted-foreground text-[11px] font-semibold tracking-[0.12em] uppercase";

const STAMP_INK: Record<StatusTone, string> = {
  neutral: "text-muted-foreground",
  info: "text-primary",
  success: "text-success-600",
  warning: "text-warning-600",
  danger: "text-danger-600",
};

const SEGMENT = {
  done: "bg-primary",
  ready: "bg-success-600",
  todo: "bg-foreground/10",
} as const;

export function InvoiceDetail({
  invoice,
  client,
  project,
  clientProjects,
  emailStatus,
  reminders,
}: InvoiceDetailProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const status = getDisplayStatus(invoice);
  const state = invoiceState({ ...invoice, status });
  const config = invoiceStateConfig[state];
  const note = invoiceNote(state, invoice);
  const number = formatInvoiceNumber(
    invoice.invoiceNumber,
    invoice.numberPrefix,
  );
  const money = (value: string | number) =>
    formatCurrency(String(value), invoice.currency);

  const isDraft = state === "draft";
  const isPaid = state === "paid";

  const balance =
    invoice.showProjectBalance && project
      ? invoiceProjectBalance({
          pricing: project.pricing,
          budget: project.budget,
          paidBefore: invoice.paidBeforeOnProject,
          thisInvoice: invoice.subTotal,
          taxRate: invoice.taxRate,
        })
      : null;

  // True until the limit lifts; re-enables the button without a refresh.
  const emailBlocked = useWithinWindow(emailStatus.blocked?.until ?? null, 0);
  const hasClientEmail = Boolean(client?.email?.trim());

  const { trigger: sendReminder, isQueued } = useUndoableAction(
    () => sendReminderAction(invoice.id),
    {
      queued: "Reminder will be sent shortly.",
      loading: "Sending reminder...",
      success: "Reminder sent.",
    },
    REMINDER_SEND_DELAY_MS,
    { onSuccess: () => router.refresh() },
  );

  const run = (
    action: () => Promise<ActionResult>,
    messages: { loading: string; success: string },
  ) =>
    startTransition(async () => {
      await runActionWithToast(action(), {
        ...messages,
        onSuccess: () => router.refresh(),
      });
    });

  // An email can't be recalled, so Send asks first and names the recipient.
  const [confirmSend, setConfirmSend] = useState(false);
  const send = () => setConfirmSend(true);
  const sendNow = () =>
    runActionWithToast(sendInvoiceAction(invoice.id), {
      loading: "Sending invoice...",
      success: ({ emailError }) =>
        emailError
          ? `${number} marked as sent`
          : `${number} emailed to ${client?.email}`,
      onSuccess: ({ emailError }) => {
        warnNotEmailed(emailError, "invoice");
        router.refresh();
      },
    });

  const markPaid = () =>
    run(() => markInvoicePaidAction(invoice.id), {
      loading: "Marking as paid...",
      success: `${number} marked as paid`,
    });

  const reminderReason = !hasClientEmail
    ? "Add an email address to this client first"
    : emailBlocked && emailStatus.blocked
      ? emailStatus.blocked.reason
      : isQueued
        ? "Reminder queued - click the toast to undo"
        : null;
  // A draft may be half-written; it goes out once every line is complete.
  const incomplete =
    Number(invoice.total) <= 0 ||
    invoice.lineItems.some((item) => !item.description.trim());
  const sendReason = incomplete
    ? "Add a description and an amount first"
    : hasClientEmail
      ? null
      : "Add an email address to this client first";

  const pdfHref = `/api/invoices/${invoice.id}/pdf`;
  const editHref = `/invoices/${invoice.id}/edit`;

  const revertToSent = () =>
    run(
      () =>
        updateInvoiceStatusAction({ invoiceId: invoice.id, status: "sent" }),
      {
        loading: "Reverting to sent...",
        success: `${number} moved back to sent`,
      },
    );

  // Side card: getting paid. Header (the "..." menu on phones): editing and deleting.
  const outstanding = state === "pending" || state === "overdue";
  const cardActions: PageAction[] = [
    ...(isDraft
      ? [
          {
            label: "Send invoice",
            kind: "primary" as const,
            icon: <SendIcon className="size-4" />,
            onClick: send,
            disabled: isPending || Boolean(sendReason),
            hint: sendReason,
          },
        ]
      : []),
    ...(outstanding
      ? [
          {
            label: "Mark as paid",
            kind: "primary" as const,
            icon: <CheckIcon className="size-4" />,
            onClick: markPaid,
            disabled: isPending,
          },
          {
            label: "Send reminder",
            kind: "secondary" as const,
            icon: <BellIcon className="size-4" />,
            onClick: sendReminder,
            disabled: isPending || Boolean(reminderReason),
            hint:
              reminderReason ??
              `${emailStatus.remaining} of ${EMAIL_LIMITS.perDocumentPerDay} emails left today`,
          },
        ]
      : []),
    invoice.canDownloadPdf
      ? {
          label: "Download PDF",
          kind: "quiet",
          href: pdfHref,
          download: true,
          icon: <DownloadIcon className="size-4" />,
        }
      : {
          label: "Download PDF (Pro)",
          kind: "quiet",
          href: UPGRADE_HREF,
          icon: <DownloadIcon className="size-4" />,
        },
    ...(isPaid
      ? [
          {
            label: "Revert to sent",
            kind: "quiet" as const,
            onClick: revertToSent,
            disabled: isPending,
            icon: <Undo2Icon className="size-4" />,
          },
        ]
      : []),
  ];
  const headerActions: PageAction[] = [
    ...(isPaid
      ? []
      : [
          {
            label: "Edit invoice",
            kind: "quiet" as const,
            href: editHref,
            icon: <PencilIcon className="size-4" />,
          },
        ]),
    {
      label: "Delete invoice",
      kind: "danger",
      onClick: () => setIsDeleteOpen(true),
      disabled: isPending,
      icon: <Trash2Icon className="size-4" />,
    },
  ];

  // ── Activity, oldest first ───────────────────────────────────────────
  const timeline: TimelineItem[] = [
    { title: "Created", detail: formatDate(invoice.createdAt) },
  ];
  if (invoice.sentAt) {
    timeline.push({
      title: `Emailed to ${client?.email || "your client"} with PDF`,
      detail: formatDate(invoice.sentAt),
      tone: "info",
    });
  }
  for (const at of reminders) {
    timeline.push({
      title: "Reminder sent",
      detail: formatDate(at),
      tone: "info",
    });
  }
  if (state === "overdue") {
    timeline.push({
      title: "Due date passed",
      detail: formatDayValue(invoice.dueDate),
      tone: "danger",
    });
  }
  if (state === "claimed" && invoice.paymentClaimedAt) {
    timeline.push({
      title: "Client says they've paid",
      detail: [formatDate(invoice.paymentClaimedAt), invoice.paymentClaimedNote]
        .filter(Boolean)
        .join(" · "),
      tone: "warning",
    });
  }
  if (invoice.paidAt) {
    timeline.push({
      title: "Marked as paid",
      detail: formatDate(invoice.paidAt),
      tone: "success",
    });
  }
  if (isDraft) {
    timeline.push({
      title: "Not sent yet",
      detail: "Send it when the work is ready",
      upcoming: true,
    });
  }

  const stamp: Record<InvoiceState, string> = {
    draft: "Draft · not sent",
    pending: note,
    overdue: note,
    claimed: "Client says paid",
    paid: note,
  };

  const issuer = invoice.issuer
    ? formatIssuer(invoice.issuer)
    : { title: "You", lines: [] };
  const company =
    client?.company && client.company !== client.name ? client.company : null;
  const clientStatus = client ? clientStatusConfig[client.status] : null;

  return (
    <>
      <PageHeader
        title={number}
        actions={<HeaderActions actions={headerActions} />}
        mobileActions="inline"
        mobileMenu={<MoreMenu actions={headerActions} />}
        badge={
          <StatusBadge status={config.tone} variant="soft">
            {config.label}
          </StatusBadge>
        }
        subtitle={`${client?.name ?? "Unknown client"} · ${project?.title ?? "No project"}`}
        backHref="/invoices"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Invoices", href: "/invoices" },
          { label: number },
        ]}

      />

      <div className="@container px-2 py-5 sm:px-3 md:px-5 lg:px-10">
        <div className="grid items-start gap-5 @[1000px]:grid-cols-[minmax(0,1fr)_21.25rem]">
          {/* ── The document ─────────────────────────────────────────── */}
          <article
            aria-label="Invoice"
            className="bg-card order-2 flex min-w-0 flex-col gap-7 rounded-lg border p-5 shadow-xs @[560px]:p-8 @[1000px]:order-0"
          >
            <header className="flex flex-wrap items-start justify-between gap-5 border-b pb-6">
              <div className="flex min-w-0 gap-3">
                {invoice.logoSrc ? (
                  <BrandLogo
                    src={invoice.logoSrc}
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
                  {issuer.lines.map((line, index) => (
                    <p
                      key={index}
                      className="text-muted-foreground text-[12.5px] wrap-anywhere"
                    >
                      {line}
                    </p>
                  ))}
                </div>
              </div>
              <div className="text-right">
                <p className={labelClass}>Invoice</p>
                <p className="font-space mt-0.5 text-[22px] font-medium tabular-nums">
                  {number}
                </p>
                <span
                  className={cn(
                    "mt-2.5 inline-block rounded-md border-2 border-current px-2 py-1 font-mono text-[11px] font-semibold tracking-wider uppercase",
                    STAMP_INK[config.tone],
                  )}
                >
                  {stamp[state]}
                </span>
              </div>
            </header>

            <dl className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-x-6 gap-y-4 text-[13.5px]">
              <div className="min-w-0">
                <dt className={labelClass}>Bill to</dt>
                <dd className="mt-1.5 font-medium wrap-anywhere">
                  {client?.name ?? "Unknown client"}
                </dd>
                <dd className="text-muted-foreground text-[12.5px] wrap-anywhere">
                  {client?.email || "No email on file"}
                </dd>
                {company && (
                  <dd className="text-muted-foreground text-[12.5px]">
                    {company}
                  </dd>
                )}
              </div>
              <div>
                <dt className={labelClass}>Issued</dt>
                <dd className="mt-1.5">
                  {isDraft ? "Not sent" : formatDate(invoice.issueDate)}
                </dd>
              </div>
              <div>
                <dt className={labelClass}>Due</dt>
                <dd className="mt-1.5">{formatDate(invoice.dueDate)}</dd>
              </div>
              <div className="min-w-0">
                <dt className={labelClass}>Project</dt>
                <dd className="mt-1.5 wrap-anywhere">
                  {project?.title ?? "No project"}
                </dd>
              </div>
            </dl>

            <table className="w-full table-fixed border-collapse">
              <thead>
                <tr className="border-b">
                  <th className={cn(labelClass, "py-2.5 text-left")}>
                    Description
                  </th>
                  <th
                    className={cn(
                      labelClass,
                      "hidden w-22 py-2.5 pl-3 text-right @[560px]:table-cell",
                    )}
                  >
                    Qty
                  </th>
                  <th
                    className={cn(
                      labelClass,
                      "hidden w-28 py-2.5 pl-3 text-right @[560px]:table-cell",
                    )}
                  >
                    Rate
                  </th>
                  <th className={cn(labelClass, "w-26 py-2.5 pl-3 text-right")}>
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoice.lineItems.map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="py-3 pr-3 align-top text-sm font-medium wrap-anywhere">
                      {item.description || (
                        <span className="text-muted-foreground font-normal">
                          No description yet
                        </span>
                      )}
                      {/* Phone: qty and rate move under the description. */}
                      <span className="text-muted-foreground mt-0.5 block text-xs font-normal tabular-nums @[560px]:hidden">
                        {formatLineItemQuantity(item.quantity, item.unit)} ×{" "}
                        {formatLineItemRate(item.rate, item.unit)}
                      </span>
                    </td>
                    <td className="font-space hidden py-3 pl-3 text-right align-top text-sm tabular-nums @[560px]:table-cell">
                      {formatLineItemQuantity(item.quantity, item.unit)}
                    </td>
                    <td className="font-space hidden py-3 pl-3 text-right align-top text-sm tabular-nums @[560px]:table-cell">
                      {formatLineItemRate(item.rate, item.unit)}
                    </td>
                    <td className="font-space py-3 pl-3 text-right align-top text-sm font-medium tabular-nums">
                      {money(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="ml-auto w-full max-w-80 text-[13.5px]">
              <div className="flex justify-between gap-6 py-1">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-space tabular-nums">
                  {money(invoice.subTotal)}
                </span>
              </div>
              {Number(invoice.taxAmount) > 0 && (
                <div className="flex justify-between gap-6 py-1">
                  <span className="text-muted-foreground">
                    Tax ({formatNumber(Number(invoice.taxRate))}%)
                  </span>
                  <span className="font-space tabular-nums">
                    {money(invoice.taxAmount)}
                  </span>
                </div>
              )}
              <div className="mt-1.5 flex items-baseline justify-between gap-6 border-t pt-2.5 font-semibold">
                <span>{isPaid ? "Total paid" : "Total due"}</span>
                <span className="font-space text-xl font-medium tabular-nums">
                  {money(invoice.total)}
                </span>
              </div>
            </div>

            {balance && (
              <div className="bg-muted/40 rounded-lg border p-4 text-[13.5px]">
                <p className={cn(labelClass, "mb-2")}>Project balance</p>
                {balanceRows(balance).map(([label, value], index, all) => {
                  const last = index === all.length - 1;
                  return (
                    <div
                      key={label}
                      className={cn(
                        "flex justify-between gap-6 py-1",
                        last && "mt-1 border-t pt-2 font-semibold",
                      )}
                    >
                      <span className={cn(!last && "text-muted-foreground")}>
                        {label}
                      </span>
                      <span className="font-space tabular-nums">
                        {money(value)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {hasPaymentDetails(invoice.payment) ? (
              <div className="bg-muted/40 rounded-lg border p-4 text-[13.5px]">
                <p className={cn(labelClass, "mb-2")}>Payment details</p>
                <div className="flex flex-col gap-1.5">
                  {invoice.payment.methods.map((method) => {
                    const { label, lines } = formatPaymentMethod(method);
                    return (
                      <p key={method.type} className="wrap-anywhere">
                        <strong className="font-medium">{label}</strong>
                        {lines.length > 0 && ` · ${lines.join(", ")}`}
                      </p>
                    );
                  })}
                  {invoice.payment.instructions?.trim() && (
                    <p className="text-muted-foreground text-[13px] wrap-anywhere whitespace-pre-line">
                      {invoice.payment.instructions}
                    </p>
                  )}
                  <p className="mt-0.5 font-mono text-xs">
                    Reference: {number}
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-muted/40 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
                <span className="text-muted-foreground text-[13.5px]">
                  Your client won&apos;t see how to pay you. Add a bank account,
                  PayPal or Wise.
                </span>
                {/* Only a draft picks up settings changes; a sent invoice keeps its details. */}
                {isDraft && (
                  <Link
                    href="/settings/business"
                    className={customButtonClasses("secondary", "sm")}
                  >
                    Set up payment methods
                  </Link>
                )}
              </div>
            )}

            {invoice.notes?.trim() && (
              <div>
                <p className={labelClass}>Notes</p>
                <p className="mt-1.5 text-sm leading-relaxed text-pretty wrap-anywhere whitespace-pre-line">
                  {invoice.notes}
                </p>
              </div>
            )}
          </article>

          {/* ── The rail (first on narrow screens) ───────────────────── */}
          <aside className="order-1 flex min-w-0 flex-col gap-4 @[1000px]:sticky @[1000px]:top-4 @[1000px]:order-0">
            <DetailCard>
              <p className="text-muted-foreground text-[12.5px]">
                {isPaid ? "Paid" : isDraft ? "Draft total" : "Amount due"}
              </p>
              <p className="font-space mt-0.5 text-[32px] leading-tight font-medium tracking-tight tabular-nums">
                {money(invoice.total)}
              </p>
              <p
                className={cn(
                  "mt-1 text-[13px]",
                  state === "overdue"
                    ? "text-danger-600"
                    : "text-muted-foreground",
                )}
              >
                {note}
              </p>
              <CardActions
                actions={cardActions}
                className="mt-4"
                hideOnPhone={false}
              />
            </DetailCard>

            {state === "claimed" && (
              <section className="bg-warning-600/12 text-warning-600 rounded-lg p-4 text-[13.5px]">
                <p className="font-semibold">Client says they&apos;ve paid</p>
                <p className="mt-1">
                  {invoice.paymentClaimedNote && (
                    <>
                      Reference:{" "}
                      <span className="font-mono">
                        {invoice.paymentClaimedNote}
                      </span>{" "}
                      ·{" "}
                    </>
                  )}
                  {invoice.paymentClaimedAt &&
                    formatShortDate(invoice.paymentClaimedAt)}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <CustomButton
                    type="button"
                    size="sm"
                    onClick={markPaid}
                    disabled={isPending}
                  >
                    Confirm received
                  </CustomButton>
                  <CustomButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={isPending}
                    onClick={() =>
                      run(() => clearPaymentClaimAction(invoice.id), {
                        loading: "Clearing the claim...",
                        success: "Claim cleared. The invoice is still due",
                      })
                    }
                  >
                    Not received yet
                  </CustomButton>
                </div>
              </section>
            )}

            <DetailCard>
              {client ? (
                <div className="flex min-w-0 items-start gap-3">
                  <AvatarInitials
                    name={client.name}
                    shape="square"
                    className="shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/clients/${client.id}`}
                      className="hover:text-primary block text-sm font-medium wrap-anywhere"
                    >
                      {client.name}
                    </Link>
                    <p className="text-muted-foreground text-[12.5px] wrap-anywhere">
                      {client.email || "No email on file"}
                    </p>
                    {company && (
                      <p className="text-muted-foreground text-[12.5px]">
                        {company}
                      </p>
                    )}
                  </div>
                  {clientStatus && (
                    <StatusBadge
                      status={clientStatus.variant}
                      variant="soft"
                      className="shrink-0"
                    >
                      {clientStatus.label}
                    </StatusBadge>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-[13px]">
                  This client has been removed.
                </p>
              )}
            </DetailCard>

            <DetailCard>
              {project ? (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className={labelClass}>Project</p>
                      <Link
                        href={`/projects/${project.id}`}
                        className="hover:text-primary mt-1 block text-sm font-medium wrap-anywhere"
                      >
                        {project.title}
                      </Link>
                    </div>
                    <StatusBadge
                      status={project.board.tone}
                      variant="soft"
                      className="shrink-0"
                    >
                      {project.board.label}
                    </StatusBadge>
                  </div>
                  <div className="text-muted-foreground mt-3 mb-2 flex justify-between text-[12.5px]">
                    <span>Milestones</span>
                    <span className="font-space tabular-nums">
                      {project.board.total
                        ? `${project.board.done} of ${project.board.total}`
                        : "-"}
                    </span>
                  </div>
                  <div className="flex gap-0.75">
                    {project.board.total ? (
                      project.board.segments.map((segment, index) => (
                        <span
                          key={index}
                          className={cn(
                            "h-1.5 flex-1 rounded-xs",
                            SEGMENT[segment],
                          )}
                        />
                      ))
                    ) : (
                      <span className="bg-foreground/10 h-1.5 flex-1 rounded-xs" />
                    )}
                  </div>
                </>
              ) : (
                <>
                  <p className={labelClass}>Project</p>
                  <p className="text-muted-foreground mt-1 mb-2.5 text-[13.5px]">
                    No project linked
                  </p>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <CustomButton
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={isPending}
                        className="gap-1.5"
                      >
                        <LinkIcon className="size-3.5" />
                        Link a project
                      </CustomButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      {clientProjects.length === 0 ? (
                        <DropdownMenuItem disabled>
                          No projects for this client
                        </DropdownMenuItem>
                      ) : (
                        clientProjects.map((option) => (
                          <DropdownMenuItem
                            key={option.id}
                            onClick={() =>
                              run(
                                () =>
                                  linkInvoiceProjectAction(
                                    invoice.id,
                                    option.id,
                                  ),
                                {
                                  loading: "Linking...",
                                  success: `Linked to ${option.title}`,
                                },
                              )
                            }
                          >
                            {option.title}
                          </DropdownMenuItem>
                        ))
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </DetailCard>

            <DetailCard title="Activity">
              <Timeline items={timeline} />
            </DetailCard>
          </aside>
        </div>
      </div>

      <ConfirmDialog
        open={confirmSend}
        onOpenChange={setConfirmSend}
        title={`Send ${number}?`}
        description={invoiceSendDescription(client?.email, client?.name ?? "This client")}
        confirmLabel="Send invoice"
        pendingLabel="Sending..."
        onConfirm={sendNow}
      />

      <DeleteDialog
        title={`Delete ${number}?`}
        description="The invoice is removed for good. Milestones it billed go back to not invoiced."
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onDelete={async () => {
          await runActionWithToast(deleteInvoiceAction(invoice.id), {
            loading: "Deleting invoice...",
            success: `${number} deleted`,
            onSuccess: () => router.push("/invoices"),
          });
        }}
      />
    </>
  );
}
