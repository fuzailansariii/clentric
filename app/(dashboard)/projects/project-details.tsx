"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useOptimistic,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import {
  ArrowUpRight,
  FileSignature,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import PageHeader from "@/components/dashboard/page-header";
import DashboardContainer from "@/components/dashboard/container";
import { DeleteDialog } from "@/components/delete-dialog";
import { customButtonClasses } from "@/components/ui/custom-button";
import { DetailCard } from "@/components/dashboard/detail-parts";
import {
  CardActions,
  HeaderActions,
  MoreMenu,
  type PageAction,
} from "@/components/dashboard/page-actions";
import { MetricStrip, type Metric } from "@/components/ui/metric-strip";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/format-currency";
import {
  formatDaysUntilDue,
  formatDayValue,
  formatShortDate,
} from "@/lib/format-due";
import { formatInvoiceNumber } from "@/lib/format-invoice-number";
import { boardProject } from "@/lib/project-progress";
import { projectLedger, sumProjectInvoices } from "@/lib/project-ledger";
import { runActionWithToast } from "@/lib/run-action-with-toast";
import { cn } from "@/lib/utils";
import { invoiceStatusConfig } from "../invoices/invoice-status-config";
import { deleteProjectAction, updateProjectAction } from "./actions";
import { MilestonesPanel } from "./milestones-panel";
import type {
  MilestoneItem,
  ProjectInvoiceRow,
  ProjectListItem,
} from "./queries";
import type { ProjectStatus } from "./project-status-config";

type FromProposal = {
  id: string;
  title: string;
  deposit: {
    id: string;
    number: string;
    paid: boolean;
    sent: boolean;
    total: string;
    daysUntilDue: number | null;
  } | null;
} | null;

const STATUS_OPTIONS = [
  { value: "not_started", label: "Not started" },
  { value: "in_progress", label: "In progress" },
  { value: "on_hold", label: "On hold" },
  { value: "completed", label: "Completed" },
] as const satisfies readonly { value: ProjectStatus; label: string }[];

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** "Not sent", "Paid Oct 2", "Due in 4 days", "3 days late". */
function invoiceNote(invoice: ProjectInvoiceRow) {
  if (invoice.status === "draft") return "Not sent";
  if (invoice.status === "paid") {
    return invoice.paidAt ? `Paid ${formatShortDate(invoice.paidAt)}` : "Paid";
  }
  return formatDaysUntilDue(invoice.daysUntilDue);
}

export function ProjectDetail({
  project,
  milestones,
  invoices,
  fromProposal,
}: {
  project: ProjectListItem;
  milestones: MilestoneItem[];
  invoices: ProjectInvoiceRow[];
  /** Set when this project was created by accepting a proposal. */
  fromProposal: FromProposal;
}) {
  const router = useRouter();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [status, setOptimisticStatus] = useOptimistic(project.status);
  const [, startStatus] = useTransition();

  const hourly = project.pricing === "hourly";
  const money = (value: string | number) =>
    formatCurrency(String(value), project.currency);

  const ledger = projectLedger({
    budget: project.budget,
    ...sumProjectInvoices(invoices),
  });
  const paidCount = invoices.filter((i) => i.status === "paid").length;
  // The strip counts before tax; taxed invoices below show their full total.
  const hasTax = invoices.some((i) => Number(i.total) !== Number(i.subTotal));

  const board = boardProject({
    status,
    pricing: project.pricing,
    billing: project.billing,
    budget: Number(project.budget),
    billed: ledger.billed,
    daysUntilDeadline: project.daysUntilDeadline,
    milestones: milestones.map((m) => ({
      id: m.id,
      title: m.title,
      done: m.status === "completed",
      dueDate: m.dueDate,
      daysUntilDue: m.daysUntilDue,
      amount: m.amount === null ? null : Number(m.amount),
      invoiced: m.invoice !== null,
    })),
  });

  const priceLabel = hourly ? "Estimate" : "Budget";
  const metrics: Metric[] = [
    {
      label: priceLabel,
      value: ledger.budget === null ? "-" : money(ledger.budget),
      sub: hourly
        ? project.hourlyRate
          ? `${money(project.hourlyRate)}/hr`
          : "Hourly"
        : "Fixed price, before tax",
    },
    {
      label: "Invoiced",
      value: money(ledger.billed),
      sub:
        ledger.percent === null
          ? "Sent invoices"
          : `${ledger.percent}% of ${priceLabel.toLowerCase()}`,
    },
    {
      label: "Paid",
      value: money(ledger.paid),
      sub: plural(paidCount, "invoice"),
    },
    {
      label: "Outstanding",
      value: money(ledger.outstanding),
      sub: "Sent, not paid",
      tone: ledger.outstanding ? "default" : "muted",
    },
    {
      label: "In drafts",
      value: money(ledger.drafts),
      sub: "Not counted as invoiced",
      tone: ledger.drafts ? "default" : "muted",
    },
    {
      label: "Left to invoice",
      value:
        ledger.remaining === null ? "-" : money(Math.max(0, ledger.remaining)),
      sub:
        ledger.remaining === null
          ? "No estimate"
          : ledger.remaining <= 0
            ? "Fully billed"
            : `Of the ${priceLabel.toLowerCase()}`,
    },
  ];

  const deliveredOn = project.completedAt ?? project.updatedAt;
  const next =
    status === "completed"
      ? `Delivered ${formatShortDate(deliveredOn)}`
      : board.next
        ? `${board.next.title} · ${board.next.dueDate ? formatDayValue(board.next.dueDate) : "No date"}`
        : board.total
          ? "All milestones done"
          : "No milestones yet";

  let deadline = "None";
  let deadlineLate = false;
  if (project.deadline) {
    const days = project.daysUntilDeadline ?? 0;
    deadlineLate = status !== "completed" && days < 0;
    const rel =
      status === "completed"
        ? "Delivered"
        : days >= 0
          ? `Due in ${plural(days, "day")}`
          : `${plural(-days, "day")} late`;
    deadline = `${formatDayValue(project.deadline)} · ${rel}`;
  }

  const details: { label: string; value: ReactNode; danger?: boolean }[] =
    [
      {
        label: "Client",
        value: (
          <Link
            href={`/clients/${project.clientId}`}
            className="text-primary hover:underline"
          >
            {project.clientName ?? "Unknown client"}
          </Link>
        ),
      },
      {
        label: "Proposal",
        value: fromProposal ? (
          <Link
            href={`/proposals/${fromProposal.id}`}
            className="text-primary hover:underline"
          >
            {fromProposal.title}
          </Link>
        ) : (
          "Started directly"
        ),
      },
      { label: "Next", value: next },
      { label: "Pricing", value: hourly ? "Hourly" : "Fixed price" },
      {
        label: hourly ? "Hourly rate" : "Rate for extra work",
        value: project.hourlyRate ? `${money(project.hourlyRate)}/hr` : "-",
      },
      {
        label: "Billing",
        value: hourly
          ? "As you go"
          : project.billing === "end"
            ? "One invoice at the end"
            : "Per milestone",
      },
      {
        label: "Start",
        value: project.startDate ? formatDayValue(project.startDate) : "-",
      },
      { label: "Deadline", value: deadline, danger: deadlineLate },
      { label: "Created", value: formatShortDate(project.createdAt) },
      { label: "Last updated", value: formatShortDate(project.updatedAt) },
    ];

  const deposit = fromProposal?.deposit;
  const waitingForDeposit = deposit && !deposit.paid;

  const changeStatus = (next: ProjectStatus) => {
    if (next === status) return;
    const label = STATUS_OPTIONS.find((o) => o.value === next)?.label;
    startStatus(async () => {
      setOptimisticStatus(next);
      const result = await updateProjectAction(project.id, { status: next });
      if (result.success) {
        toast.success(`Status: ${label}`);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  const newInvoiceHref = `/invoices/new?${new URLSearchParams({
    clientId: project.clientId,
    projectId: project.id,
  }).toString()}`;

  // Side card: billing. Header (the "..." menu on phones): editing and deleting.
  const cardActions: PageAction[] = [
    {
      label: "New invoice",
      kind: "primary",
      href: newInvoiceHref,
      icon: <PlusIcon className="size-4" />,
    },
  ];
  const headerActions: PageAction[] = [
    {
      label: "Edit project",
      kind: "quiet",
      href: `/projects/${project.id}/edit`,
      icon: <PencilIcon className="size-4" />,
    },
    {
      label: "Delete project",
      kind: "danger",
      onClick: () => setIsDeleteOpen(true),
      icon: <Trash2Icon className="size-4" />,
    },
  ];

  return (
    <>
      <PageHeader
        title={project.title}
        badge={
          <span className="flex items-center gap-2">
            <StatusBadge status={board.tone} variant="soft">
              {board.label}
            </StatusBadge>
            {fromProposal && (
              <Link
                href={`/proposals/${fromProposal.id}`}
                title={fromProposal.title}
                className="text-foreground hover:bg-muted focus-visible:ring-ring inline-flex h-5.5 shrink-0 items-center gap-1 rounded-full border px-2 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                <FileSignature aria-hidden="true" className="size-3" />
                From proposal
                <ArrowUpRight aria-hidden="true" className="size-3" />
              </Link>
            )}
          </span>
        }
        subtitle={`${project.clientName ?? "No client"} · ${hourly ? "Hourly" : "Fixed price"}`}
        backHref="/projects"
        actions={<HeaderActions actions={headerActions} />}
        mobileActions="inline"
        mobileMenu={<MoreMenu actions={headerActions} />}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Projects", href: "/projects" },
          { label: project.title },
        ]}
      />

      <DashboardContainer>
        <div className="@container flex flex-col gap-4 pb-4">
          {waitingForDeposit && (
            <div className="bg-warning-600/12 text-warning-600 flex flex-wrap items-center justify-between gap-3 rounded-lg px-4 py-3.5 text-[13.5px]">
              <span>
                <strong className="font-semibold">
                  Waiting for deposit {deposit.number}
                </strong>{" "}
                · {money(deposit.total)} ·{" "}
                {!deposit.sent
                  ? "Not sent"
                  : deposit.daysUntilDue === null
                    ? "Sent"
                    : formatDaysUntilDue(deposit.daysUntilDue)}
              </span>
              <Link
                href={`/invoices/${deposit.id}`}
                className={customButtonClasses("secondary", "sm")}
              >
                View invoice
              </Link>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <MetricStrip items={metrics} columns={6} />
            {hasTax && (
              <p className="text-muted-foreground text-xs">
                Amounts above are before tax. Invoices below show their total
                with tax.
              </p>
            )}
          </div>

          <div className="grid items-start gap-5 @[1000px]:grid-cols-[minmax(0,1fr)_21.25rem]">
            {/* First on narrow screens; atop the right column when wide. */}
            <DetailCard className="@[1000px]:col-start-2 @[1000px]:row-start-1">
              <CardActions actions={cardActions} hideOnPhone={false} />
            </DetailCard>

            <div className="flex min-w-0 flex-col gap-4 @[1000px]:col-start-1 @[1000px]:row-span-2 @[1000px]:row-start-1">
              <MilestonesPanel
                project={{
                  id: project.id,
                  clientId: project.clientId,
                  billing: project.billing,
                  currency: project.currency,
                }}
                milestones={milestones}
              />

              <section className="bg-card rounded-lg border p-4 shadow-xs sm:p-4.5">
                <h2 className="mb-3 text-sm font-semibold">Description</h2>
                <p
                  className={cn(
                    "text-sm leading-relaxed text-pretty whitespace-pre-line",
                    !project.description && "text-muted-foreground",
                  )}
                >
                  {project.description || "No description provided."}
                </p>
              </section>

              <section className="bg-card overflow-hidden rounded-lg border shadow-xs">
                <div className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-4.5">
                  <h2 className="text-sm font-semibold">Invoices</h2>
                  <span className="text-muted-foreground font-space text-[12.5px] tabular-nums">
                    {invoices.length}
                  </span>
                </div>
                {invoices.length === 0 ? (
                  <p className="text-muted-foreground border-t px-4 py-4 text-[13.5px] sm:px-4.5">
                    No invoices yet.
                  </p>
                ) : (
                  <ul>
                    {invoices.map((invoice) => {
                      const config = invoiceStatusConfig[invoice.status];
                      const number = formatInvoiceNumber(
                        invoice.invoiceNumber,
                        invoice.numberPrefix,
                      );
                      return (
                        <li key={invoice.id} className="border-t">
                          <Link
                            href={`/invoices/${invoice.id}`}
                            className="hover:bg-muted/50 focus-visible:ring-ring grid min-h-14 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 px-4 py-2.5 transition-colors focus-visible:ring-2 focus-visible:-outline-offset-2 focus-visible:outline-none sm:px-4.5 @[560px]:grid-cols-[minmax(0,1fr)_auto_8rem]"
                          >
                            <span className="min-w-0">
                              <span className="block text-sm font-medium">
                                {number}
                              </span>
                              <span className="text-muted-foreground block truncate text-[12.5px]">
                                {[invoice.firstLine, invoiceNote(invoice)]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </span>
                            </span>
                            <span className="font-space text-right text-sm font-medium tabular-nums">
                              {formatCurrency(invoice.total, invoice.currency)}
                            </span>
                            <span className="col-start-1 @[560px]:col-start-auto @[560px]:justify-self-end">
                              <StatusBadge
                                status={config.variant}
                                variant="soft"
                                size="sm"
                              >
                                {config.label}
                              </StatusBadge>
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </div>

            <aside className="flex min-w-0 flex-col gap-4 @[1000px]:sticky @[1000px]:top-4 @[1000px]:col-start-2">
              <section className="bg-card rounded-lg border p-4 shadow-xs sm:p-4.5">
                <h2 className="mb-3 text-sm font-semibold">Status</h2>
                <SegmentedControl
                  label="Project status"
                  options={STATUS_OPTIONS}
                  value={status}
                  onChange={changeStatus}
                  className="grid w-full grid-cols-2"
                  itemClassName="h-9 justify-center px-3 text-[13px]"
                />
              </section>

              <section className="bg-card rounded-lg border p-4 shadow-xs sm:p-4.5">
                <h2 className="mb-1 text-sm font-semibold">Details</h2>
                <dl>
                  {details.map((row) => (
                    <div
                      key={row.label}
                      className="flex items-baseline justify-between gap-4 border-t py-2.25 text-[13.5px] first:border-t-0"
                    >
                      <dt className="text-muted-foreground shrink-0">
                        {row.label}
                      </dt>
                      <dd
                        className={cn(
                          "min-w-0 text-right font-medium wrap-anywhere",
                          row.danger && "text-danger-600",
                        )}
                      >
                        {row.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            </aside>
          </div>
        </div>

        <DeleteDialog
          open={isDeleteOpen}
          onOpenChange={setIsDeleteOpen}
          onDelete={async () => {
            await runActionWithToast(deleteProjectAction(project.id), {
              loading: "Deleting project",
              success: "Project deleted",
              onSuccess: () => router.push("/projects"),
              onError: (error) => {
                throw error;
              },
            });
          }}
          title="Delete project"
          description={`Delete "${project.title}"? Its milestones go with it. Invoices stay.`}
        />
      </DashboardContainer>
    </>
  );
}
