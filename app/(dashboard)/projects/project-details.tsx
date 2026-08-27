"use client";

import { AvatarInitials } from "@/components/ui/avatar-initials";
import { StatusBadge } from "@/components/ui/status-badge";
import { CustomButton } from "@/components/ui/custom-button";
import { formatDate, formatRelativeDate } from "@/lib/format-date";
import { formatCurrency } from "@/lib/format-currency";
import { Check, Folder, PencilIcon, TrashIcon, X } from "lucide-react";
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
import { DeadlinePicker } from "@/components/deadline-picker";
import { ProjectListItem } from "./queries";
import { EditableProjectInput, editableProjectsSchema } from "./schema";
import { projectStatusConfig } from "./project-status-config";
import { deleteProjectAction, updateProjectAction } from "./actions";
import PageHeader from "@/components/dashboard/page-header";
import DashboardContainer from "@/components/dashboard/container";
import { cn } from "@/lib/utils";
import { Field } from "@/components/ui/input";
import MilestonesPanel, { MilestoneListItem } from "./milestones-panel";
import ProgressBar from "@/components/ui/progress-bar";

export function toProjectFormDefaults(
  project: ProjectListItem,
): EditableProjectInput {
  return {
    title: project.title,
    description: project.description ?? "",
    budget: project.budget,
    deadline: project.deadline ?? "",
    status: project.status,
  };
}

export function ProjectDetail({
  project,
  initialMilestones,
  initialEdit = false,
}: {
  project: ProjectListItem;
  initialMilestones: MilestoneListItem[];
  initialEdit?: boolean;
}) {
  const [activeSection, setActiveSection] = useState<
    "milestones" | "activities"
  >("milestones");
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(initialEdit);
  const [formError, setFormError] = useState<string | null>(null);
  const [liveProgress, setLiveProgress] = useState(project.progress);

  const router = useRouter();
  const config = projectStatusConfig[project.status];

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
    router.replace(`/projects/${project.id}`);
  };

  useEffect(() => {
    if (!initialEdit) return;
    reset(toProjectFormDefaults(project));
    setIsEditing(true);
  }, [initialEdit, project, reset]);

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
                <TrashIcon className="h-3.5 w-3.5" /> Delete
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
        <form onSubmit={onSubmit} className="space-y-4">
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
                    Deadline
                  </label>
                  <Controller
                    control={control}
                    name="deadline"
                    render={({ field }) => (
                      <DeadlinePicker
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
            <div className="bg-border grid grid-cols-2 gap-px border-t sm:grid-cols-4">
              <div className="bg-background px-5 py-4">
                <p className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
                  Budget
                </p>
                <p className="mt-1 text-lg font-semibold">
                  {formatCurrency(project.budget)}
                </p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Fixed price
                </p>
              </div>

              <div className="bg-background px-5 py-4">
                <p className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
                  Deadline
                </p>
                <p className="mt-1 text-lg font-semibold text-amber-600">
                  {project.deadline ? formatDate(project.deadline) : "—"}
                </p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {project.deadline ? "Upcoming" : "No deadline"}
                </p>
              </div>

              <div className="bg-background px-5 py-4">
                <p className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
                  Progress
                </p>
                <p className="mt-1 text-lg font-semibold text-blue-600">
                  {liveProgress}%
                </p>
                <ProgressBar value={liveProgress} className="mt-2" />
                <p className="text-muted-foreground mt-0.5 text-xs">
                  of project complete
                </p>
              </div>

              <div className="bg-background px-5 py-4">
                <p className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
                  Client
                </p>
                <div className="mt-1.5 flex items-center gap-2">
                  <AvatarInitials
                    name={project.clientName ?? "?"}
                    size="sm"
                    shape="circle"
                  />
                  <p className="text-sm font-medium">
                    {project.clientName ?? "—"}
                  </p>
                </div>
              </div>
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
                  <dd className="mt-1 font-medium">
                    {formatRelativeDate(project.updatedAt)}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </form>

        {/* Milestones & Activities */}
        <div className="border-border mt-4 rounded-xl border">
          <div
            role="tablist"
            className="border-border flex items-center gap-1 px-6"
          >
            <TabButton
              id="milestones-tab"
              label="Milestones"
              count={project.totalMilestones}
              isActive={activeSection === "milestones"}
              onClick={() => setActiveSection("milestones")}
            />
            <TabButton
              id="tablist"
              label="Activities"
              isActive={activeSection === "activities"}
              onClick={() => setActiveSection("activities")}
            />
          </div>
          <div role="tabpanel" className="border-t">
            {activeSection === "milestones" ? (
              <MilestonesPanel
                initialMilestones={initialMilestones}
                projectId={project.id}
                onProgressChange={setLiveProgress}
              />
            ) : (
              activeSection === "activities" && <h2>Activities</h2>
            )}
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
          title="Delete Project"
          description={`Are you sure you want to delete "${project.title}"? This can't be undone.`}
        />
      </DashboardContainer>
    </>
  );
}
