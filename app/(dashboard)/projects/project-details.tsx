"use client";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { StatusBadge } from "@/components/ui/status-badge";
import { CustomButton } from "@/components/ui/custom-button";
import { formatDate, formatRelativeDate } from "@/lib/format-date";
import { formatCurrency } from "@/lib/format-currency";
import { Check, PencilIcon, Plus, TrashIcon, X } from "lucide-react";
import { useEffect, useState } from "react";
import { TabButton } from "@/components/ui/tab-button";
import { DeleteDialog } from "@/components/delete-dialog";
import { useRouter } from "next/navigation";
import { runActionWithToast } from "@/lib/run-action-with-toast";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DataField } from "@/components/field";
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
  initialEdit = false,
}: {
  project: ProjectListItem;
  initialEdit?: boolean;
}) {
  const [activeSection, setActiveSection] =
    useState<"milestones">("milestones");
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(initialEdit);
  const [formError, setFormError] = useState<string | null>(null);

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
    if (!initialEdit) {
      return;
    }

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
      <PageHeader
        title={project.title}
        badge={
          <StatusBadge status={config.variant}>{config.label}</StatusBadge>
        }
        subtitle={`${project.clientName ?? "No Project"} · Created ${formatDate(project.createdAt)}`}
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
        <form onSubmit={onSubmit} className="border-border rounded-xl border">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5">
            <div className="flex items-center gap-3">
              <AvatarInitials
                name={project.clientName ?? project.title}
                variant="neutral"
                shape="square"
                size="lg"
              />
              <div>
                {isEditing ? (
                  <div className="flex flex-col gap-1">
                    <input
                      {...register("title")}
                      className="border-input bg-input/20 focus-visible:border-ring focus-visible:ring-ring/20 rounded-lg border px-2 py-1 font-mono text-base font-medium tracking-tight focus-visible:ring-2 focus-visible:outline-none"
                    />
                    {errors.title && (
                      <span className="text-danger-600 text-xs">
                        {errors.title.message}
                      </span>
                    )}
                  </div>
                ) : (
                  <h2 className="font-mono font-medium tracking-tight">
                    {project.title}
                  </h2>
                )}
                <div className="mt-0.5 flex items-center gap-2">
                  {isEditing ? (
                    <Controller
                      control={control}
                      name="status"
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger className="h-7 w-auto text-xs">
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
                  ) : (
                    <StatusBadge status={config.variant}>
                      {config.label}
                    </StatusBadge>
                  )}
                  {project.clientName && (
                    <span className="text-muted-foreground text-sm">
                      {project.clientName}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="border-border border-t" />

          {/* Fields */}
          <dl className="grid grid-cols-2 gap-6 px-6 py-5 sm:grid-cols-4">
            <div>
              {isEditing ? (
                <div className="flex flex-col gap-0.5">
                  <label className="text-muted-foreground font-sans text-[13px] font-medium">
                    Budget
                  </label>
                  <div className="relative">
                    <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                      $
                    </span>
                    <input
                      {...register("budget")}
                      className="border-input bg-input/20 focus-visible:border-ring focus-visible:ring-ring/20 h-10 w-full rounded-lg border pr-3 pl-7 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none"
                    />
                  </div>
                  {errors.budget && (
                    <span className="text-danger-600 text-xs">
                      {errors.budget.message}
                    </span>
                  )}
                </div>
              ) : (
                <DataField
                  label="Budget"
                  value={formatCurrency(project.budget)}
                />
              )}
            </div>

            <div>
              {isEditing ? (
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
              ) : (
                <DataField
                  label="Deadline"
                  value={project.deadline ? formatDate(project.deadline) : null}
                />
              )}
            </div>

            <DataField label="Progress" value={`${project.progress}%`} />

            <DataField label="Client" value={project.clientName} />
          </dl>

          {formError && (
            <div className="border-t px-6 py-3 sm:px-8">
              <p className="text-destructive text-sm">{formError}</p>
            </div>
          )}

          <div className="border-border border-t" />
          <div className="px-6 py-5">
            <DataField
              label="Description"
              editing={isEditing}
              value={project.description}
              registration={register("description")}
              error={errors.description?.message}
              type="textarea"
            />
          </div>

          <div className="border-border border-t" />

          {/* Footer */}
          <div className="text-muted-foreground flex items-center gap-3 px-6 py-3.5 text-xs">
            <span>Created {formatDate(project.createdAt)}</span>
          </div>
        </form>

        <div className="border-border rounded-xl border">
          <div
            role="tablist"
            aria-label="Project sections"
            className="border-border flex items-center gap-1 px-6"
          >
            <TabButton
              id="milestones-tab"
              label="Milestones"
              count={project.totalMilestones}
              isActive={activeSection === "milestones"}
              onClick={() => setActiveSection("milestones")}
            />
          </div>
          <div
            id="project-section-panel"
            role="tabpanel"
            aria-labelledby="milestones-tab"
            className="border-t"
          >
            {/* <MilestonesPanel projectId={project.id} className="border-none" /> */}
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
