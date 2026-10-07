"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Field } from "@/components/ui/input";
import { SaveBar } from "@/components/settings/save-bar";
import { runActionWithToast } from "@/lib/run-action-with-toast";
import { updatePaymentInstructionsAction } from "./actions";
import {
  paymentInstructionsSchema,
  type PaymentInstructionsInput,
  type PaymentInstructionsOutput,
} from "./schema";

/**
 * The optional note printed under the payment methods on invoices
 * (users.payment_details). Rendered at the bottom of the payments card.
 */
export function PaymentInstructionsForm({
  instructions,
}: {
  instructions: string | null;
}) {
  const form = useForm<
    PaymentInstructionsInput,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any,
    PaymentInstructionsOutput
  >({
    resolver: zodResolver(paymentInstructionsSchema),
    defaultValues: { instructions: instructions ?? "" },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = form;

  const onSubmit = handleSubmit(async (data) => {
    await runActionWithToast(updatePaymentInstructionsAction(data), {
      loading: "Saving...",
      success: "Note saved",
      onSuccess: () => reset(data),
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="px-5 py-4 sm:px-6">
        <Field
          {...register("instructions")}
          id="payment-instructions"
          multiline
          rows={3}
          label="Note (optional)"
          placeholder="e.g. Please include the invoice number as the reference."
          error={errors.instructions?.message}
        />
      </div>
      <SaveBar
        isDirty={isDirty}
        isPending={isSubmitting}
        disabled={!isDirty}
      />
    </form>
  );
}
