"use client";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { ProjectInput, projectSchema } from "../schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { runActionWithToast } from "@/lib/run-action-with-toast";
import { createProjectAction } from "../actions";
import DashboardContainer from "@/components/dashboard/container";
import PageHeader from "@/components/dashboard/page-header";
import FormSection from "@/components/dashboard/form-section";
import { Field } from "@/components/ui/input";
import { ClientCombobox, ClientOption } from "@/components/client-combobox";
import { CustomButton } from "@/components/ui/custom-button";
import { cn } from "@/lib/utils";
import { ProjectStatus, projectStatusConfig } from "../project-status-config";

export default function NewProjectsForm({
  clients,
}: {
  clients: ClientOption[];
}) {
  const [formError, setFormError] = useState<string | null>(null);
  const router = useRouter();

  const {
    handleSubmit,
    register,
    formState: { errors, isValid, isSubmitting },
    control,
  } = useForm<ProjectInput>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      status: "not_started",
    },
  });

  const onSubmit = handleSubmit(async (data: ProjectInput) => {
    setFormError(null);
    await runActionWithToast(createProjectAction(data), {
      loading: "Creating project...",
      success: "Project created.",
      onSuccess: ({ projectId }) => {
        router.push(`/projects/${projectId}`);
      },
      onError: (message) => {
        if (message === "No changes to save") return;
        setFormError(message);
      },
    });
  });

  return (
    <DashboardContainer>
      <PageHeader
        title="New Project"
        description="Add a project and link it to a client to start tracking progress, milestones, and budget."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Projects", href: "/projects" },
          { label: "New" },
        ]}
      />

      <form onSubmit={onSubmit} className="mx-auto mt-8 max-w-4xl pb-12">
        <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
          {/* Project Info */}
          <FormSection
            title="Tell us about your project"
            step="01 Project Information"
            description="Give it a clear name and a short summary so it's easy to find later."
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <Controller
                control={control}
                name="clientId"
                render={({ field }) => (
                  <ClientCombobox
                    clients={clients}
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.clientId?.message}
                  />
                )}
              />
              <Field
                {...register("title")}
                label="Title"
                placeholder="e.g. Clentric"
                error={errors.title?.message}
              />
              <Field
                multiline
                {...register("description")}
                label="Description"
                placeholder="What's this project about? Add scope, goals, or any details worth noting."
                error={errors.description?.message}
              />
            </div>
          </FormSection>

          <div className="bg-border h-px" />

          <FormSection
            title="Set the budget and timeline"
            step="02 Budget & Timeline"
            description="Estimate what this project is worth and when it's due."
          >
            <div className="sm: grid grid-cols-2 gap-5">
              <Field
                {...register("budget")}
                label="Budget"
                placeholder="0.00"
                prefix="$"
                error={errors.budget?.message}
              />
              <Field
                {...register("deadline")}
                label="Deadline"
                placeholder="YYYY-MM-DD"
                error={errors.deadline?.message}
              />
            </div>
          </FormSection>

          <div className="bg-border h-px" />

          <FormSection
            title="Where does it stand?"
            step="03 Status"
            description="Set the current status — you can always update this as work progresses."
          >
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <div className="flex flex-col gap-1.5">
                  <label className="text-muted-foreground text-[13px] font-medium">
                    Status
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(projectStatusConfig) as ProjectStatus[]).map(
                      (status) => {
                        const config = projectStatusConfig[status];
                        const isSelected = field.value === status;

                        return (
                          <button
                            key={status}
                            type="button"
                            onClick={() => field.onChange(status)}
                            className={cn(
                              "flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors",
                              isSelected
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border hover:bg-muted/50",
                            )}
                          >
                            <span
                              className={cn(
                                "h-2 w-2 rounded-full",
                                config.dotColor,
                              )}
                            />
                            {config.label}
                          </button>
                        );
                      },
                    )}
                  </div>
                  {errors.status && (
                    <span className="text-danger-600 text-xs">
                      {errors.status.message}
                    </span>
                  )}
                </div>
              )}
            />
          </FormSection>
        </div>

        <div className="mt-8 flex justify-end gap-3 px-6 pb-6">
          <CustomButton
            type="button"
            variant="secondary"
            onClick={() => router.back()}
          >
            Cancel
          </CustomButton>
          <CustomButton type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Project"}
          </CustomButton>
        </div>
      </form>
    </DashboardContainer>
  );
}
