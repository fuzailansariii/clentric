"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/input";
import { CustomButton } from "@/components/ui/custom-button";
import { runActionWithToast } from "@/lib/run-action-with-toast";
import { useReturnFocus } from "@/hooks/use-return-focus";
import {
  PAYMENT_METHOD_FIELDS,
  PAYMENT_METHOD_LABELS,
  type PaymentMethodDetails,
  type PaymentMethodType,
} from "@/lib/payment-methods";
import { upsertPaymentMethodAction } from "./actions";
import {
  paymentMethodSchema,
  type PaymentMethodFormInput,
  type PaymentMethodFormOutput,
} from "./schema";

export type PaymentDialogState = {
  type: PaymentMethodType;
  /** Opened from the toggle: saving also switches the method on. */
  fromToggle: boolean;
};

export function PaymentMethodDialog({
  state,
  existing,
  onClose,
}: {
  state: PaymentDialogState | null;
  existing: PaymentMethodDetails | undefined;
  onClose: () => void;
}) {
  const returnFocus = useReturnFocus();

  return (
    <Dialog open={state !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md" {...returnFocus}>
        {/* Keyed by type so switching methods starts a fresh form. */}
        {state && (
          <PaymentMethodForm
            key={state.type}
            state={state}
            existing={existing}
            onDone={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function PaymentMethodForm({
  state,
  existing,
  onDone,
}: {
  state: PaymentDialogState;
  existing: PaymentMethodDetails | undefined;
  onDone: () => void;
}) {
  const label = PAYMENT_METHOD_LABELS[state.type];
  const fields = PAYMENT_METHOD_FIELDS[state.type];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<PaymentMethodFormInput, any, PaymentMethodFormOutput>({
    resolver: zodResolver(paymentMethodSchema),
    defaultValues: {
      type: state.type,
      accountHolder: existing?.accountHolder ?? "",
      bankName: existing?.bankName ?? "",
      accountNumber: existing?.accountNumber ?? "",
      routingCode: existing?.routingCode ?? "",
      paypalEmail: existing?.paypalEmail ?? "",
      wiseAccount: existing?.wiseAccount ?? "",
      upiId: existing?.upiId ?? "",
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form;

  const onSubmit = handleSubmit(async (data) => {
    await runActionWithToast(
      upsertPaymentMethodAction({
        ...data,
        showOnInvoices: state.fromToggle ? true : undefined,
      }),
      {
        loading: "Saving...",
        success: `${label} saved`,
        onSuccess: onDone,
      },
    );
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>
          {existing ? `Edit ${label}` : `Set up ${label}`}
        </DialogTitle>
        <DialogDescription>
          Printed on your invoices while it is switched on. Invoices you have
          already sent keep the details they went out with.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4">
        {fields.map((field) => (
          <Field
            key={field.name}
            {...register(field.name)}
            id={`payment-${field.name}`}
            label={field.label}
            placeholder={field.placeholder}
            inputMode={field.inputMode}
            autoComplete="off"
            error={errors[field.name]?.message}
          />
        ))}
      </div>

      <DialogFooter>
        <DialogClose asChild>
          <CustomButton type="button" variant="secondary" size="sm">
            Cancel
          </CustomButton>
        </DialogClose>
        <CustomButton type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save"}
        </CustomButton>
      </DialogFooter>
    </form>
  );
}
