"use client";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { StatusBadge } from "@/components/ui/status-badge";
import { CustomButton } from "@/components/ui/custom-button";
import { formatPhone } from "@/lib/format-phone";
import { formatDate, formatRelativeDate } from "@/lib/format-date";
import { clientStatusConfig } from "../client-status-config";
import { Check, PencilIcon, RefreshCw, TrashIcon, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { TabButton } from "@/components/ui/tab-button";
import { ProjectsPanel } from "./projects-panel";
import { ClientInvoice, InvoicesPanel } from "./invoices-panel";
import { DeleteDialog } from "@/components/delete-dialog";
import { deleteClientAction, updateClientAction } from "../actions";
import { useRouter } from "next/navigation";
import { runActionWithToast } from "@/lib/run-action-with-toast";
import { Controller, useForm } from "react-hook-form";
import { ClientInput, clientSchema } from "../schema";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ClientRow } from "@/src/db/schema/clients";
import { toClientFormsDefault } from "@/lib/client-form-defaults";
import { DataField } from "@/components/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PhoneField, PhoneFieldHandle } from "@/components/ui/phone-field";
import { CountryCombobox } from "@/components/ui/country-combobox";
import { ProjectListItem } from "../../projects/queries";
import PageHeader from "@/components/dashboard/page-header";
import DashboardContainer from "@/components/dashboard/container";

export function ClientDetail({
  client,
  invoices,
  projects,
  initialEdit = false,
}: {
  client: ClientRow;
  invoices: ClientInvoice[];
  projects: ProjectListItem[];
  initialEdit?: boolean;
}) {
  const [activeSection, setActiveSection] = useState<"projects" | "invoices">(
    "projects",
  );
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(initialEdit);
  const [formError, setFormError] = useState<string | null>(null);

  const router = useRouter();
  const config = clientStatusConfig[client.status];

  const {
    handleSubmit,
    register,
    control,
    setValue,
    formState: { isSubmitting, errors },
    reset,
    watch,
  } = useForm<ClientInput>({
    resolver: zodResolver(clientSchema),
    defaultValues: toClientFormsDefault(client),
  });

  const phoneFieldRef = useRef<PhoneFieldHandle>(null);
  const countryValue = watch("country");

  const handleEditClick = () => {
    reset(toClientFormsDefault(client));
    setIsEditing(true);
  };

  const handleCancelClick = () => {
    reset(toClientFormsDefault(client));
    setIsEditing(false);
    router.replace(`/clients/${client.id}`);
  };

  useEffect(() => {
    if (!initialEdit) {
      return;
    }

    reset(toClientFormsDefault(client));
    setIsEditing(true);
  }, [initialEdit, client, reset]);

  const onSubmit = handleSubmit(async (data: ClientInput) => {
    setFormError(null);
    await runActionWithToast(updateClientAction(client.id, data), {
      loading: "Updating client...",
      success: "Client updated.",
      onSuccess: () => {
        setIsEditing(false);
        router.replace(`/clients/${client.id}`);
      },
      onError: setFormError,
    });
  });

  return (
    <>
      <PageHeader
        title={client.name}
        subtitle="Client details"
        badge={
          <StatusBadge
            status={config.variant}
            className={config.dim ? "opacity-60" : undefined}
          >
            {config.label}
          </StatusBadge>
        }
        backHref="/clients"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Clients", href: "/clients" },
          { label: client.name },
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
        <div className="flex flex-col gap-5">
          <form onSubmit={onSubmit} className="border-border rounded-xl border">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5">
              <div className="flex items-center gap-3">
                <AvatarInitials
                  name={client.name}
                  variant="neutral"
                  shape="square"
                  size="lg"
                />
                <div>
                  {isEditing ? (
                    <div className="flex flex-col gap-1">
                      <input
                        {...register("name")}
                        className="border-input bg-input/20 focus-visible:border-ring focus-visible:ring-ring/20 rounded-lg border px-2 py-1 font-mono text-base font-medium tracking-tight focus-visible:ring-2 focus-visible:outline-none"
                      />
                      {errors.name && (
                        <span className="text-danger-600 text-xs">
                          {errors.name.message}
                        </span>
                      )}
                    </div>
                  ) : (
                    <h2 className="font-mono font-medium tracking-tight">
                      {client.name}
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
                              {Object.entries(clientStatusConfig).map(
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
                      <StatusBadge
                        status={config.variant}
                        className={config.dim ? "opacity-60" : undefined}
                      >
                        {config.label}
                      </StatusBadge>
                    )}
                    {client.company && (
                      <span className="text-muted-foreground text-sm">
                        {client.company}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-border border-t" />

            {/* Fields */}
            <dl className="grid grid-cols-2 gap-6 px-6 py-5 sm:grid-cols-4">
              <DataField
                label="Email"
                editing={isEditing}
                value={client.email}
                href={
                  !isEditing && client.email
                    ? `mailto:${client.email}`
                    : undefined
                }
                registration={register("email")}
                error={errors.email?.message}
                type="email"
              />

              <div>
                {isEditing ? (
                  <Controller
                    control={control}
                    name="phone"
                    render={({ field }) => (
                      <PhoneField
                        ref={phoneFieldRef}
                        value={field.value}
                        onChange={field.onChange}
                        error={errors.phone?.message}
                        defaultCountryValue={client.country ?? undefined}
                        syncCountryValue={countryValue}
                        onDialCountryChange={(isoValue) =>
                          setValue("country", isoValue, {
                            shouldValidate: true,
                          })
                        }
                      />
                    )}
                  />
                ) : (
                  <DataField
                    label="Phone"
                    value={client.phone ? formatPhone(client.phone) : null}
                    href={client.phone ? `tel:${client.phone}` : undefined}
                  />
                )}
              </div>

              <DataField
                label="Company"
                editing={isEditing}
                value={client.company}
                registration={register("company")}
                error={errors.company?.message}
                type="text"
              />

              <div>
                {isEditing ? (
                  <>
                    <Controller
                      control={control}
                      name="country"
                      render={({ field }) => (
                        <CountryCombobox
                          value={field.value}
                          onChange={(value) => {
                            phoneFieldRef.current?.resetOverride();
                            field.onChange(value);
                          }}
                        />
                      )}
                    />
                    {errors.country && (
                      <p className="text-destructive text-sm">
                        {errors.country.message}
                      </p>
                    )}
                  </>
                ) : (
                  <DataField label="Country" value={client.country} />
                )}
              </div>
            </dl>

            {formError && (
              <div className="border-t px-6 py-3 sm:px-8">
                <p className="text-destructive text-sm">{formError}</p>
              </div>
            )}

            {(client.notes || true) && (
              <>
                <div className="border-border border-t" />
                <div className="px-6 py-5">
                  <DataField
                    label="Notes"
                    editing={isEditing}
                    value={client.notes}
                    registration={register("notes")}
                    error={errors.notes?.message}
                    type="textarea"
                  />
                </div>
              </>
            )}

            <div className="border-border border-t" />

            {/* Footer */}
            <div className="text-muted-foreground flex items-center gap-3 px-6 py-3.5 text-xs">
              <span>Added {formatDate(client.createdAt)}</span>
              <span>·</span>
              <span>
                Last updated {formatRelativeDate(client.updatedAt)} (
                {formatDate(client.updatedAt)})
              </span>
            </div>
          </form>
          <div className="border-border rounded-xl border">
            <div
              role="tablist"
              aria-label="Client sections"
              className="border-border flex items-center gap-1 px-6"
            >
              <TabButton
                id="project-tab"
                label="Projects"
                count={projects.length}
                isActive={activeSection === "projects"}
                onClick={() => setActiveSection("projects")}
              />
              <TabButton
                id="invoices-tab"
                label="Invoices"
                count={invoices.length}
                isActive={activeSection === "invoices"}
                onClick={() => setActiveSection("invoices")}
              />
            </div>
            <div
              id="client-section-panel"
              role="tabpanel"
              aria-labelledby={
                activeSection === "projects" ? "project-tab" : "invoices-tab"
              }
              className="border-t"
            >
              {activeSection === "projects" ? (
                <ProjectsPanel projects={projects} className="border-none" />
              ) : (
                <InvoicesPanel invoices={invoices} className="border-none" />
              )}
            </div>
          </div>
          <DeleteDialog
            open={isDeleteOpen}
            onOpenChange={setIsDeleteOpen}
            onDelete={async () => {
              await runActionWithToast(deleteClientAction(client.id), {
                loading: "Deleting Client",
                success: "Client deleted",
                onSuccess: () => router.push("/clients"),
                onError: (error) => {
                  throw error;
                },
              });
            }}
            title="Delete Client"
            description={`Are you sure you want to delete "${client.name}"? This can't be undone.`}
          />
        </div>
      </DashboardContainer>
    </>
  );
}
