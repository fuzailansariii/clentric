"use client";

import {
  Controller,
  type Control,
  type FieldErrors,
  type UseFormRegister,
} from "react-hook-form";
import { Plus, Users } from "lucide-react";
import { ClientCombobox, type ClientOption } from "@/components/client-combobox";
import { Field } from "@/components/ui/input";
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
};

const SWITCH =
  "text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex items-center gap-1.5 self-start rounded-sm text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none";

/** Bill a saved client, or just type who you're billing (saved as a client with the invoice). */
export function BillToField({
  control,
  register,
  errors,
  clients,
  onClientChange,
  isNew,
  onToggleNew,
}: BillToFieldProps) {
  if (isNew) {
    return (
      <div className="grid gap-5 sm:col-span-2 sm:grid-cols-2">
        <Field
          {...register("newClient.name")}
          label="Bill to"
          placeholder="Client or company name"
          error={errors.newClient?.name?.message ?? errors.clientId?.message}
        />
        <div className="flex flex-col gap-2">
          <Field
            {...register("newClient.email")}
            label="Their email (optional)"
            type="email"
            placeholder="So you can email the invoice"
            error={errors.newClient?.email?.message}
          />
          {onToggleNew && clients.length > 0 && (
            <button
              type="button"
              onClick={() => onToggleNew(false)}
              className={SWITCH}
            >
              <Users aria-hidden="true" className="size-3.5" />
              Choose a saved client
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
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
      {onToggleNew && (
        <button
          type="button"
          onClick={() => onToggleNew(true)}
          className={SWITCH}
        >
          <Plus aria-hidden="true" className="size-3.5" />
          Bill someone new
        </button>
      )}
    </div>
  );
}
