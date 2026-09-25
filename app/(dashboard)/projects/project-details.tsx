"use client";

import { AvatarInitials } from "@/components/ui/avatar-initials";
import { StatusBadge } from "@/components/ui/status-badge";
import { CustomButton } from "@/components/ui/custom-button";
import { formatDate, formatRelativeDate } from "@/lib/format-date";
import { formatCurrency } from "@/lib/format-currency";
import { formatInvoiceNumber } from "@/lib/format-invoice-number";
import { invoiceStatusConfig } from "../invoices/invoice-status-config";
import type { ProjectInvoiceRow } from "./queries";
import Link from "next/link";
import {
  Check,
  FileSignature,
  Folder,
  PencilIcon,
  Plus,
  Trash2Icon,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { TabButton } from "@/components/ui/tab-button";
import { DeleteDialog } from "@/components/delete-dialog";
import { useRouter } from "next/navigation";
import { runActionWithToast } from "@/lib/run-action-with-toast";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePickerField } from "@/components/date-picker-field";
import type { MilestoneItem, ProjectListItem } from "./queries";
import { MilestonesPanel } from "./milestones-panel";
import { EditableProjectInput, editableProjectsSchema } from "./schema";
import { projectStatusConfig } from "./project-status-config";
import { getProjectDeadlineLabel } from "./project-deadline-label";
import { deleteProjectAction, updateProjectAction } from "./actions";
import PageHeader from "@/components/dashboard/page-header";
import DashboardContainer from "@/components/dashboard/container";
import { cn } from "@/lib/utils";
import { Field } from "@/components/ui/input";
import { StatsCards } from "@/components/ui/stats-cards";

export function toProjectFormDefaults(
  project: ProjectListItem,
): EditableProjectInput {
  return {
    title: project.title,
    description: project.description ?? "",
    budget: project.budget,
    hourlyRate: project.hourlyRate ?? "",
    deadline: project.deadline ?? "",
    status: project.status,
  };
}

export function ProjectDetail({
  project,
  milestones,
  invoices,
  fromProposal,
  initialEdit = false,
}: {
  project: ProjectListItem;
  milestones: MilestoneItem[];
  invoices: ProjectInvoiceRow[];
  /** Set when this project was created by accepting a proposal. */
  fromProposal: { id: string; title: string } | null;
  initialEdit?: boolean;
}) {
  const [activeSection, setActiveSection] =
    useState<"milestones">("milestones");
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(initialEdit);
  const [formError, setFormError] = useState<string | null>(null);

  const router = useRouter();
  const config = projectStatusConfig[project.status];
  const deadline = getProjectDeadlineLabel(project);

  const {
    handleSubmit,
    register,
    control,
    formState: { isSubmitting, errors },
    reset,
  } = useForm<EditableProjectInput>({
    resolver: zodResolver(editableProjectsSchema),
    defaultValues: toProjectFormDefaults(project),
  });

  const handleEditClick = () => {
    reset(toProjectFormDefaults(project));
    setIsEditing(true);
  };

  const handleCancelClick = () => {
    reset(toProjectFormDefaults(project));
    setIsEditing(false);
    // Cancel doesn't change any data, so there's nothing to refetch — just
    // tidy the `?edit=true` out of the address bar. Using router.replace()
    // here would ask Next.js to re-run this (dynamic) Server Component and
    // re-query the DB on every single Cancel click for no reason. Writing
    // straight to the History API updates the URL without going through
    // Next's router/data-fetching at all.
    window.history.replaceState(null, "", `/projects/${project.id}`);
  };

  // Arriving with ?edit=true switches into edit mode — adjusted during render
  // rather than in an effect, so the read-only view never flashes first.
  const [prevInitialEdit, setPrevInitialEdit] = useState(initialEdit);
  if (initialEdit !== prevInitialEdit) {
    setPrevInitialEdit(initialEdit);
    if (initialEdit) setIsEditing(true);
  }

  // Keyed on id + updatedAt rather than the project object: a milestone change
  // re-renders this page with a fresh-but-identical project, which must not
  // wipe an edit in progress. reset() writes to react-hook-form's own store.
  const projectVersion = `${project.id}:${new Date(project.updatedAt).getTime()}`;

  useEffect(() => {
    if (initialEdit) reset(toProjectFormDefaults(project));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialEdit, projectVersion, reset]);

  const onSubmit = handleSubmit(async (data) => {
    setFormError(null);
    await runActionWithToast(updateProjectAction(project.id, data), {
      loading: "Updating project...",
      success: "Project updated.",
      onSuccess: () => {
        setIsEditing(false);
        router.replace(`/projects/${project.id}`);
        router.refresh();
      },
      onError: setFormError,
    });
  });

  return (
    <>
      {/* ========== PAGE HEADER ========== */}
      <PageHeader
        title={project.title}
        badge={
          <StatusBadge status={config.variant}>{config.label}</StatusBadge>
        }
        subtitle={`${project.clientName ?? "No Client"} · Created ${formatDate(project.createdAt)}`}
        backHref="/projects"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Projects", href: "/projects" },
          { label: project.title },
        ]}
        actions={
          isEditing ? (
            <>
              <CustomButton
                type="button"
                variant="secondary"
                onClick={handleCancelClick}
                className="flex items-center gap-1"
              >
                <X className="h-3.5 w-3.5" /> Cancel
              </CustomButton>
              <CustomButton
                type="button"
                variant="primary"
                onClick={onSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-1"
              >
                <Check className="h-3.5 w-3.5" />
                {isSubmitting ? "Saving..." : "Save"}
              </CustomButton>
            </>
          ) : (
            <>
              <CustomButton
                variant="secondary"
                onClick={() => setIsDeleteOpen(true)}
                className="flex items-center gap-1"
              >
                <Trash2Icon className="h-3.5 w-3.5" /> Delete
              </CustomButton>
              <CustomButton
                variant="primary"
                onClick={handleEditClick}
                className="flex items-center gap-1"
              >
                <PencilIcon className="h-3.5 w-3.5" /> Edit
              </CustomButton>
            </>
          )
        }
      />

      <DashboardContainer>
        <form onSubmit={onSubmit} className="mb-4 space-y-4">
          {/* ========== MAIN CARD ========== */}
          <div
            className={cn(
              "overflow-hidden rounded-xl border",
              isEditing
                ? "border-blue-200 bg-blue-50/50 dark:border-blue-900/40 dark:bg-blue-950/20"
                : "border-border bg-background",
            )}
          >
            {/* Title area */}
            <div className="flex items-start gap-3 px-5 pt-5 pb-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/40">
                <Folder className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-muted-foreground mb-1 text-[11px] font-medium tracking-wider uppercase">
                  Project Title
                </p>

                {isEditing ? (
                  <div>
                    <input
                      {...register("title")}
                      className="border-input bg-background focus-visible:ring-ring w-full max-w-lg rounded-lg border px-3 py-1.5 text-base font-semibold outline-none focus-visible:ring-2"
                    />
                    {errors.title && (
                      <p className="text-destructive mt-1 text-xs">
                        {errors.title.message}
                      </p>
                    )}
                  </div>
                ) : (
                  <h2 className="text-lg font-semibold tracking-tight">
                    {project.title}
                  </h2>
                )}
              </div>
            </div>

            {/* Edit form row (only when editing) */}
            {isEditing && (
              <div className="flex flex-wrap items-end gap-3 border-t border-blue-100/80 px-5 py-4 dark:border-blue-900/30">
                <div className="space-y-1">
                  <label className="text-muted-foreground text-[11px] font-medium uppercase">
                    Status
                  </label>
                  <Controller
                    control={control}
                    name="status"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="bg-background h-9 w-37">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(projectStatusConfig).map(
                            ([value, cfg]) => (
                              <SelectItem key={value} value={value}>
                                {cfg.label}
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-muted-foreground text-[11px] font-medium uppercase">
                    Budget
                  </label>
                  <Field
                    {...register("budget")}
                    placeholder="0.00"
                    prefix="$"
                    error={errors.budget?.message}
                  />
                  {errors.budget && (
                    <p className="text-destructive text-xs">
                      {errors.budget.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-muted-foreground text-[11px] font-medium uppercase">
                    Hourly rate
                  </label>
                  <Field
                    {...register("hourlyRate")}
                    placeholder="Client's rate"
                    prefix="$"
                    suffix="/hr"
                    inputMode="decimal"
                    error={errors.hourlyRate?.message}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-muted-foreground text-[11px] font-medium uppercase">
                    Deadline
                  </label>
                  <Controller
                    control={control}
                    name="deadline"
                    render={({ field }) => (
                      <DatePickerField
                        value={field.value}
                        onChange={field.onChange}
                        error={errors.deadline?.message}
                      />
                    )}
                  />
                </div>
              </div>
            )}

            {/* Metrics (always visible, single source of truth) */}
            <div className="border-t">
              <StatsCards
                variant="divided"
                items={[
                  {
                    label: "Budget",
                    value: formatCurrency(project.budget, project.currency),
                    hint: project.hourlyRate
                      ? `${formatCurrency(project.hourlyRate, project.currency)}/hr for hour lines`
                      : undefined,
                  },
                  {
                    label: "Deadline",
                    value: (
                      <span
                        className={cn(
                          deadline.late && "text-danger-600",
                          project.status === "completed" &&
                            "text-muted-foreground",
                        )}
                      >
                        {project.deadline ? formatDate(project.deadline) : "—"}
                      </span>
                    ),
                    // "Due in 9 days", "3 days late", "Delivered", "No deadline".
                    hint: deadline.label,
                  },
                  {
                    label: "Progress",
                    value: (
                      <span className="text-blue-600">{project.progress}%</span>
                    ),
                    hint: "of project complete",
                  },
                  {
                    label: "Client",
                    value: (
                      <div className="flex min-w-0 items-center gap-2">
                        <AvatarInitials
                          name={project.clientName ?? "?"}
                          size="sm"
                          shape="circle"
                          className="shrink-0"
                        />
                        <span className="truncate text-sm font-medium">
                          {project.clientName ?? "—"}
                        </span>
                      </div>
                    ),
                  },
                ]}
              />

              {/* Where this project came from. Only set when it was created
                  by accepting a proposal. */}
              {fromProposal && (
                <Link
                  href={`/proposals/${fromProposal.id}`}
                  className="text-muted-foreground hover:text-foreground focus-visible:ring-ring mt-4 inline-flex max-w-full items-center gap-1.5 rounded-sm text-xs underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
                >
                  <FileSignature className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">
                    From proposal: {fromProposal.title}
                  </span>
                </Link>
              )}
            </div>
          </div>

          {formError && <p className="text-destructive text-sm">{formError}</p>}

          {/* ========== DESCRIPTION + META ========== */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Description */}
            <div className="border-border bg-background rounded-xl border p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-medium">Description</h3>
              </div>

              {isEditing ? (
                <div>
                  <textarea
                    {...register("description")}
                    rows={5}
                    className="border-input bg-background focus-visible:ring-ring w-full resize-none rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2"
                  />
                  {errors.description && (
                    <p className="text-destructive mt-1 text-xs">
                      {errors.description.message}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {project.description || "No description provided."}
                </p>
              )}
            </div>

            {/* Only meta that is NOT in the metrics row */}
            <div className="border-border bg-background rounded-xl border p-5">
              <h3 className="mb-4 text-sm font-medium">Project details</h3>

              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-muted-foreground text-xs uppercase">
                    Created
                  </dt>
                  <dd className="mt-1 font-medium">
                    {formatDate(project.createdAt)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs uppercase">
                    Last updated
                  </dt>
                  {/* Relative time is read from the clock, so server and
                      browser can disagree by a minute at render time. */}
                  <dd className="mt-1 font-medium" suppressHydrationWarning>
                    {formatRelativeDate(project.updatedAt)}
                  </dd>
                  <dd className="text-muted-foreground mt-0.5 text-xs">
                    {formatDate(project.updatedAt)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs uppercase">
                    Hourly rate
                  </dt>
                  <dd className="mt-1 font-medium">
                    {project.hourlyRate
                      ? `${formatCurrency(project.hourlyRate, project.currency)}/hr`
                      : "Not set"}
                  </dd>
                  <dd className="text-muted-foreground mt-0.5 text-xs">
                    {project.hourlyRate
                      ? "Prefills hour lines on invoices"
                      : "Invoices use the client's rate"}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </form>

        {/* Milestones (unchanged) */}
        <div className="border-border rounded-xl border">
          <div
            role="tablist"
            className="border-border flex items-center gap-1 px-6"
          >
            <TabButton
              id="milestones-tab"
              panelId="milestones-panel"
              label="Milestones"
              count={milestones.length}
              isActive={activeSection === "milestones"}
              onClick={() => setActiveSection("milestones")}
            />
          </div>
          <div
            id="milestones-panel"
            role="tabpanel"
            aria-labelledby="milestones-tab"
            className="border-t"
          >
            <MilestonesPanel projectId={project.id} milestones={milestones} />
          </div>
        </div>

        {/* Invoices raised against this project. Each is formatted in its own
            currency rather than summed - a project can hold more than one. */}
        <div className="bg-card mt-4 overflow-hidden rounded-xl border">
          <div className="border-border flex flex-wrap items-center justify-between gap-3 border-b px-6 py-4">
            <h2 className="text-sm font-semibold">
              Invoices
              {invoices.length > 0 && (
                <span className="text-muted-foreground ml-1.5 font-normal">
                  {invoices.length}
                </span>
              )}
            </h2>
            <Link
              href={`/invoices/new?clientId=${project.clientId}&projectId=${project.id}`}
            >
              <CustomButton
                type="button"
                variant="secondary"
                className="gap-1.5 text-xs"
              >
                <Plus className="h-4 w-4" />
                Create invoice
              </CustomButton>
            </Link>
          </div>

          {invoices.length === 0 ? (
            <p className="text-muted-foreground px-6 py-8 text-center text-sm">
              No invoices for this project yet.
            </p>
          ) : (
            <ul className="divide-border divide-y">
              {invoices.map((invoice) => {
                const config = invoiceStatusConfig[invoice.status];
                return (
                  <li key={invoice.id}>
                    <Link
                      href={`/invoices/${invoice.id}`}
                      className="hover:bg-muted/50 focus-visible:ring-ring flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-6 py-3.5 transition-colors focus-visible:ring-2 focus-visible:-outline-offset-2"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="font-mono text-[13px] font-medium">
                          {formatInvoiceNumber(
                            invoice.invoiceNumber,
                            invoice.numberPrefix,
                          )}
                        </span>
                        <StatusBadge
                          status={config.variant}
                          variant="soft"
                          size="sm"
                          className={config.dim ? "opacity-60" : undefined}
                        >
                          {config.label}
                        </StatusBadge>
                      </span>
                      <span className="text-muted-foreground flex items-center gap-4 text-xs">
                        <span>{formatDate(invoice.issueDate)}</span>
                        <span className="text-foreground text-sm font-semibold tabular-nums">
                          {formatCurrency(invoice.total, invoice.currency)}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
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
          title="Delete Project"
          description={`Are you sure you want to delete "${project.title}"? This can't be undone.`}
        />
      </DashboardContainer>
    </>
  );
}
