"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  Controller,
  useFieldArray,
  useForm,
  useWatch,
  type Control,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon, XIcon } from "lucide-react";

import PageHeader from "@/components/dashboard/page-header";
import DashboardContainer from "@/components/dashboard/container";
import { ClientCombobox, type ClientOption } from "@/components/client-combobox";
import { DatePickerField } from "@/components/date-picker-field";
import { CustomButton } from "@/components/ui/custom-button";
import { Field } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { NO_CHANGE_MESSAGE } from "@/lib/error-message";
import { formatCurrency } from "@/lib/format-currency";
import { runActionWithToast } from "@/lib/run-action-with-toast";
import { cn } from "@/lib/utils";
import { createProjectAction, updateProjectAction } from "./actions";
import {
  projectEditFormSchema,
  projectSchema,
  type ProjectFormInput,
  type ProjectInput,
} from "./schema";

const PRICING = [
  { value: "fixed", label: "Fixed price" },
  { value: "hourly", label: "Hourly" },
] as const;
const BILLING = [
  { value: "per_milestone", label: "Per milestone" },
  { value: "end", label: "One invoice at the end" },
] as const;
const STATUS = [
  { value: "not_started", label: "Not started" },
  { value: "in_progress", label: "In progress" },
  { value: "on_hold", label: "On hold" },
  { value: "completed", label: "Completed" },
] as const;

const BLANK_ROW = { title: "", dueDate: "", amount: "" };

/** The project being edited; absent on the new-project page. */
export type EditableProject = {
  id: string;
  title: string;
  clientName: string | null;
  values: ProjectFormInput;
};

const cents = (value: string | undefined) =>
  Math.round(Number(value || 0) * 100) || 0;

function Optional({ children }: { children: ReactNode }) {
  return (
    <>
      {children} <span className="font-normal opacity-70">optional</span>
    </>
  );
}

function Card({
  title,
  children,
  className,
}: {
  title: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "bg-card @container rounded-lg border p-4 shadow-xs sm:p-4.5",
        className,
      )}
    >
      <h2 className="mb-4 text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function ControlLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-muted-foreground mb-1.5 block text-[13px] font-medium">
      {children}
    </span>
  );
}

export function ProjectForm({
  clients,
  initialClientId,
  project,
}: {
  clients: ClientOption[];
  /** Set when arriving from a client's page. */
  initialClientId?: string;
  project?: EditableProject;
}) {
  const router = useRouter();
  const isEdit = Boolean(project);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    handleSubmit,
    register,
    control,
    formState: { errors, isSubmitting },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<ProjectFormInput, any, ProjectInput>({
    resolver: zodResolver(isEdit ? projectEditFormSchema : projectSchema),
    defaultValues: project?.values ?? {
      clientId: initialClientId ?? "",
      title: "",
      description: "",
      pricing: "fixed",
      budget: "",
      hourlyRate: "",
      billing: "per_milestone",
      startDate: "",
      deadline: "",
      status: "not_started",
      milestones: [BLANK_ROW],
    },
  });

  // keyName keeps RHF's row key off our own `id` (the saved milestone's id).
  const rows = useFieldArray({ control, name: "milestones", keyName: "key" });
  const hourly = useWatch({ control, name: "pricing" }) === "hourly";

  const onSubmit = handleSubmit(async (data) => {
    setFormError(null);
    const onError = (message: string) => {
      if (message !== NO_CHANGE_MESSAGE) setFormError(message);
    };
    const open = (id: string) => {
      router.push(`/projects/${id}`);
      router.refresh();
    };

    if (project) {
      await runActionWithToast(updateProjectAction(project.id, data), {
        loading: "Saving changes...",
        success: "Changes saved",
        onSuccess: () => open(project.id),
        onError,
      });
    } else {
      await runActionWithToast(createProjectAction(data), {
        loading: "Creating project...",
        success: "Project created",
        onSuccess: ({ projectId }) => open(projectId),
        onError,
      });
    }
  });

  const cancelHref = project ? `/projects/${project.id}` : "/projects";

  return (
    <>
      <PageHeader
        title={project ? `Edit ${project.title}` : "New project"}
        subtitle="Break the work into milestones you can invoice"
        backHref={cancelHref}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Projects", href: "/projects" },
          ...(project
            ? [
                { label: project.title, href: `/projects/${project.id}` },
                { label: "Edit" },
              ]
            : [{ label: "New" }]),
        ]}
        actions={
          <>
            <CustomButton
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => router.push(cancelHref)}
            >
              Cancel
            </CustomButton>
            <CustomButton
              type="submit"
              form="project-form"
              variant="primary"
              size="sm"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Saving..."
                : project
                  ? "Save changes"
                  : "Create project"}
            </CustomButton>
          </>
        }
      />

      <DashboardContainer>
        <form
          id="project-form"
          onSubmit={onSubmit}
          noValidate
          className="@container pb-8"
        >
          <div className="grid items-start gap-5 @[1000px]:grid-cols-[minmax(0,1fr)_21.25rem]">
            <div className="flex min-w-0 flex-col gap-4">
              <Card title="Project">
                <div className="grid gap-4 @[560px]:grid-cols-2">
                  {project ? (
                    <Field
                      label="Client"
                      value={project.clientName ?? "Unknown client"}
                      disabled
                      readOnly
                    />
                  ) : (
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
                  )}
                  <Field
                    {...register("title")}
                    label="Title"
                    placeholder="e.g. Website redesign"
                    error={errors.title?.message}
                  />
                  <div className="@[560px]:col-span-2">
                    <Field
                      multiline
                      {...register("description")}
                      label={<Optional>Description</Optional>}
                      placeholder="What's in scope, links, anything you'll want later"
                      error={errors.description?.message}
                    />
                  </div>
                </div>
              </Card>

              <Card title="Pricing">
                <div className="grid gap-4 @[560px]:grid-cols-2">
                  <div className="@[560px]:col-span-2">
                    <ControlLabel>How you charge</ControlLabel>
                    <Controller
                      control={control}
                      name="pricing"
                      render={({ field }) => (
                        <SegmentedControl
                          label="How you charge"
                          options={PRICING}
                          value={field.value ?? "fixed"}
                          onChange={field.onChange}
                        />
                      )}
                    />
                  </div>
                  <Field
                    {...register("budget")}
                    label={
                      hourly ? <Optional>Estimate</Optional> : "Agreed price"
                    }
                    placeholder="0"
                    prefix="$"
                    inputMode="decimal"
                    error={errors.budget?.message}
                  />
                  <Field
                    {...register("hourlyRate")}
                    label={
                      hourly ? (
                        <Optional>Hourly rate</Optional>
                      ) : (
                        <Optional>Hourly rate for extra work</Optional>
                      )
                    }
                    placeholder="0"
                    prefix="$"
                    suffix="/hr"
                    inputMode="decimal"
                    error={errors.hourlyRate?.message}
                  />
                  {!hourly && (
                    <div className="@[560px]:col-span-2">
                      <ControlLabel>Billing</ControlLabel>
                      <Controller
                        control={control}
                        name="billing"
                        render={({ field }) => (
                          <SegmentedControl
                            label="Billing"
                            options={BILLING}
                            value={field.value ?? "per_milestone"}
                            onChange={field.onChange}
                            className="grid w-full @[440px]:inline-flex @[440px]:w-auto"
                          />
                        )}
                      />
                    </div>
                  )}
                </div>
              </Card>

              <Card title="Schedule">
                <div className="grid gap-4 @[560px]:grid-cols-2">
                  <Controller
                    control={control}
                    name="startDate"
                    render={({ field }) => (
                      <DatePickerField
                        label={<Optional>Start date</Optional>}
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        error={errors.startDate?.message}
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name="deadline"
                    render={({ field }) => (
                      <DatePickerField
                        label={<Optional>Deadline</Optional>}
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        error={errors.deadline?.message}
                      />
                    )}
                  />
                  <div className="@[560px]:col-span-2">
                    <ControlLabel>Status</ControlLabel>
                    <Controller
                      control={control}
                      name="status"
                      render={({ field }) => (
                        <SegmentedControl
                          label="Status"
                          options={STATUS}
                          value={field.value}
                          onChange={field.onChange}
                          className="grid w-full grid-cols-2 @[560px]:inline-flex @[560px]:w-auto"
                          itemClassName="justify-center"
                        />
                      )}
                    />
                  </div>
                </div>
              </Card>

              <Card title={<Optional>Milestones</Optional>}>
                <div
                  aria-hidden="true"
                  className="text-muted-foreground hidden grid-cols-[1.25rem_minmax(0,1fr)_10rem_8rem_2.75rem] gap-2 pb-1.5 text-xs @[560px]:grid"
                >
                  <span />
                  <span>Milestone</span>
                  <span>Due</span>
                  <span className="text-right">Amount</span>
                  <span />
                </div>
                {rows.fields.map((row, index) => (
                  <div
                    key={row.key}
                    className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.75rem] items-start gap-2 border-t py-2.5 @[560px]:grid-cols-[1.25rem_minmax(0,1fr)_10rem_8rem_2.75rem]"
                  >
                    <span className="text-muted-foreground font-space hidden pt-3 text-xs tabular-nums @[560px]:block">
                      {index + 1}
                    </span>
                    <div className="col-span-3 @[560px]:col-span-1">
                      <Field
                        {...register(`milestones.${index}.title`)}
                        aria-label={`Milestone ${index + 1} name`}
                        placeholder="e.g. Discovery workshop"
                        autoComplete="off"
                        error={errors.milestones?.[index]?.title?.message}
                      />
                    </div>
                    <Controller
                      control={control}
                      name={`milestones.${index}.dueDate`}
                      render={({ field }) => (
                        <DatePickerField
                          aria-label={`Milestone ${index + 1} due date`}
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          error={errors.milestones?.[index]?.dueDate?.message}
                        />
                      )}
                    />
                    <Field
                      {...register(`milestones.${index}.amount`)}
                      aria-label={`Milestone ${index + 1} amount`}
                      placeholder="0"
                      prefix="$"
                      inputMode="decimal"
                      className="text-right"
                      error={errors.milestones?.[index]?.amount?.message}
                    />
                    <CustomButton
                      type="button"
                      variant="ghost"
                      onClick={() => rows.remove(index)}
                      aria-label={`Remove milestone ${index + 1}`}
                      className="h-11 w-11 px-0!"
                    >
                      <XIcon className="size-4" />
                    </CustomButton>
                  </div>
                ))}
                {errors.milestones?.root?.message && (
                  <p className="text-danger-600 pb-2 text-xs">
                    {errors.milestones.root.message}
                  </p>
                )}
                <div className="border-t pt-2.5">
                  <CustomButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => rows.append(BLANK_ROW)}
                    className="gap-1.5"
                  >
                    <PlusIcon className="size-4" />
                    Add milestone
                  </CustomButton>
                </div>
              </Card>

              {formError && (
                <p className="text-danger-600 text-sm">{formError}</p>
              )}
            </div>

            <aside className="flex min-w-0 flex-col gap-4 @[1000px]:sticky @[1000px]:top-4">
              <PriceMeter control={control} />
            </aside>
          </div>
        </form>
      </DashboardContainer>
    </>
  );
}

/** How much of the price the milestones account for. */
function PriceMeter({ control }: { control: Control<ProjectFormInput> }) {
  const [pricing, budget, milestones] = useWatch({
    control,
    name: ["pricing", "budget", "milestones"],
  });
  const fixed = pricing !== "hourly";
  const price = cents(budget);
  const assigned = (milestones ?? []).reduce(
    (sum, row) => sum + cents(row?.amount),
    0,
  );
  const diff = price - assigned;
  const money = (c: number) => formatCurrency(String(c / 100), "USD");

  const tone = !price
    ? "text-muted-foreground"
    : diff < 0
      ? "text-danger-600"
      : diff === 0
        ? "text-success-600"
        : "text-primary";
  const fill = !price
    ? "bg-muted-foreground"
    : diff < 0
      ? "bg-danger-600"
      : diff === 0
        ? "bg-success-600"
        : "bg-primary";
  const word = fixed ? "price" : "estimate";
  const message = !price
    ? fixed
      ? "Enter the agreed price to check milestones against it."
      : "No estimate. Hourly work is billed as you go."
    : diff === 0
      ? `Milestones add up to the ${word}.`
      : diff > 0
        ? `${money(diff)} not assigned yet.`
        : `${money(-diff)} over.`;

  return (
    <Card title={fixed ? "Milestones vs price" : "Milestones vs estimate"}>
      <div className="bg-foreground/10 h-2 overflow-hidden rounded-full">
        <span
          className={cn("block h-full transition-[width]", fill)}
          style={{
            width: price ? `${Math.min(100, (assigned / price) * 100)}%` : 0,
          }}
        />
      </div>
      <dl className="mt-3 text-[13.5px]">
        <div className="flex justify-between gap-4 py-2">
          <dt className="text-muted-foreground">Milestones</dt>
          <dd className="font-space font-medium tabular-nums">
            {money(assigned)}
          </dd>
        </div>
        <div className="flex justify-between gap-4 border-t py-2">
          <dt className="text-muted-foreground">
            {fixed ? "Agreed price" : "Estimate"}
          </dt>
          <dd className="font-space font-medium tabular-nums">
            {price ? money(price) : "-"}
          </dd>
        </div>
      </dl>
      <p className={cn("mt-1 text-[13px]", tone)}>{message}</p>
    </Card>
  );
}
