"use client";

import {
  Controller,
  type Control,
  type FieldErrors,
  type UseFormRegister,
} from "react-hook-form";
import {
  ClientCombobox,
  type ClientOption,
} from "@/components/client-combobox";
import { Field } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import type { InvoiceFormInput } from "./schema";

type BillToFieldProps = {
  control: Control<InvoiceFormInput>;
  register: UseFormRegister<InvoiceFormInput>;
  errors: FieldErrors<InvoiceFormInput>;
  clients: ClientOption[];
  onClientChange: (onChange: (value: string) => void, value: string) => void;
  /** Typing a name instead of picking a saved client. */
  isNew: boolean;
  /** Null while editing: an existing invoice keeps a saved client. */
  onToggleNew: ((isNew: boolean) => void) | null;
  /** Why a new client can't be added (plan limit); hides the switch. */
  newBlocked?: string | null;
};

const WHO = [
  { value: "saved", label: "Saved client" },
  { value: "new", label: "Bill someone new" },
] as const;

/** Bill a saved client, or just type who you're billing (saved as a client with the invoice). */
export function BillToField({
  control,
  register,
  errors,
  clients,
  onClientChange,
  isNew,
  onToggleNew,
  newBlocked,
}: BillToFieldProps) {
  return (
    <>
      {onToggleNew && newBlocked && (
        <p className="text-muted-foreground text-xs @[560px]:col-span-2">
          Billing someone new adds a client. {newBlocked}
        </p>
      )}
      {onToggleNew && !newBlocked && (
        <div className="@[560px]:col-span-2">
          <SegmentedControl
            label="Client"
            options={WHO}
            value={isNew ? "new" : "saved"}
            onChange={(value) => onToggleNew(value === "new")}
          />
        </div>
      )}

      {isNew ? (
        <>
          <Field
            {...register("newClient.name")}
            label="Name"
            placeholder="Person or business"
            error={errors.newClient?.name?.message ?? errors.clientId?.message}
          />
          <div className="flex flex-col gap-1">
            <Field
              {...register("newClient.email")}
              label={
                <>
                  Email <span className="font-normal opacity-70">optional</span>
                </>
              }
              type="email"
              placeholder="name@company.com"
              error={errors.newClient?.email?.message}
            />
            <span className="text-muted-foreground text-xs">
              Saved as a new client. Needed to email the invoice.
            </span>
          </div>
        </>
      ) : (
        <Controller
          control={control}
          name="clientId"
          render={({ field }) => (
            <ClientCombobox
              clients={clients}
              value={field.value ?? ""}
              onChange={(value) => onClientChange(field.onChange, value)}
              error={errors.clientId?.message}
            />
          )}
        />
      )}
    </>
  );
}
