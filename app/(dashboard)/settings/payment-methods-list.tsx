"use client";

import { useOptimistic, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { AlertTriangle, Landmark, Plus, Smartphone } from "lucide-react";
import { SiPaypal, SiWise } from "react-icons/si";
import { Switch } from "@/components/ui/switch";
import { CustomButton } from "@/components/ui/custom-button";
import { SettingsRow } from "@/components/settings/settings-row";
import { cn } from "@/lib/utils";
import {
  PAYMENT_METHOD_LABELS,
  describePaymentMethod,
  isPaymentMethodSetUp,
  type PaymentMethodType,
} from "@/lib/payment-methods";
import { setPaymentMethodVisibilityAction } from "./actions";
import {
  PaymentMethodDialog,
  type PaymentDialogState,
} from "./payment-method-dialog";
import type { PaymentSettings } from "./queries";

type Method = PaymentSettings["methods"][number];

/** The methods offered here, in display order. */
const OFFERED_TYPES = ["bank", "paypal", "wise"] as const;

/** Brand mark and "+ …" button wording for each method. */
const METHOD_DISPLAY: Record<
  PaymentMethodType,
  { icon: ReactNode; tileClass: string; addLabel: string }
> = {
  bank: {
    icon: <Landmark />,
    tileClass: "bg-secondary text-foreground border-border border",
    addLabel: "Bank account",
  },
  paypal: {
    icon: <SiPaypal />,
    tileClass: "bg-[#003087] text-white",
    addLabel: "PayPal",
  },
  wise: {
    icon: <SiWise />,
    tileClass: "bg-[#9FE870] text-[#163300]",
    addLabel: "Wise",
  },
  upi: {
    icon: <Smartphone />,
    tileClass: "bg-secondary text-foreground border-border border",
    addLabel: "UPI",
  },
};

function MethodIcon({ type }: { type: PaymentMethodType }) {
  const { icon, tileClass } = METHOD_DISPLAY[type];
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-lg [&_svg]:size-4",
        tileClass,
      )}
    >
      {icon}
    </span>
  );
}

/**
 * Bank transfer, PayPal and Wise, one row each. A method that's been added
 * has an Edit button and a switch deciding whether it's printed on invoices;
 * one that hasn't has a "+ PayPal" style button that opens its form.
 *
 * Rendered inside the payments card, so it returns rows rather than a card.
 */
export function PaymentMethodsList({ methods }: { methods: Method[] }) {
  const [dialog, setDialog] = useState<PaymentDialogState | null>(null);
  const [, startTransition] = useTransition();

  // The switch flips at once; the server action's revalidation brings the
  // real value back, and a failed save rolls it back on its own.
  const [optimisticMethods, setVisibility] = useOptimistic(
    methods,
    (state, change: { type: PaymentMethodType; show: boolean }) =>
      state.map((method) =>
        method.type === change.type
          ? { ...method, showOnInvoices: change.show }
          : method,
      ),
  );

  const byType = new Map(optimisticMethods.map((m) => [m.type, m]));
  const isSetUp = (type: PaymentMethodType) => {
    const method = byType.get(type);
    return method ? isPaymentMethodSetUp(method) : false;
  };

  // UPI is no longer offered, but an account that already set it up keeps
  // its row — otherwise a UPI switched on for invoices couldn't be turned off.
  const types: PaymentMethodType[] = isSetUp("upi")
    ? [...OFFERED_TYPES, "upi"]
    : [...OFFERED_TYPES];

  const anySetUp = types.some(isSetUp);
  const noneShown =
    anySetUp && !optimisticMethods.some((m) => m.showOnInvoices);

  const toggle = (type: PaymentMethodType, show: boolean) => {
    startTransition(async () => {
      setVisibility({ type, show });
      const result = await setPaymentMethodVisibilityAction({ type, show });
      if (!result.success) toast.error(result.error);
    });
  };

  return (
    <>
      {noneShown && (
        <div
          role="status"
          className="bg-warning-600/10 text-warning-600 flex items-start gap-2 px-5 py-3 text-sm sm:px-6"
        >
          <AlertTriangle
            aria-hidden="true"
            className="mt-0.5 h-4 w-4 shrink-0"
          />
          No payment method will appear on your invoices.
        </div>
      )}

      {types.map((type) => {
        const method = byType.get(type);
        const label = PAYMENT_METHOD_LABELS[type];
        const switchId = `show-${type}`;

        return (
          <SettingsRow
            key={type}
            title={
              <span className="flex min-w-0 items-center gap-3">
                <MethodIcon type={type} />
                <span className="min-w-0">
                  <span className="block">{label}</span>
                  <span className="text-muted-foreground block truncate font-normal">
                    {isSetUp(type)
                      ? describePaymentMethod(method)
                      : "Not added"}
                  </span>
                </span>
              </span>
            }
          >
            {isSetUp(type) ? (
              <>
                <CustomButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setDialog({ type, fromToggle: false })}
                  aria-label={`Edit ${label}`}
                >
                  Edit
                </CustomButton>
                <Switch
                  id={switchId}
                  checked={Boolean(method?.showOnInvoices)}
                  onCheckedChange={(checked) => toggle(type, checked)}
                  aria-label={`Show ${label} on invoices`}
                />
              </>
            ) : (
              <CustomButton
                type="button"
                variant="secondary"
                size="sm"
                className="gap-1"
                onClick={() => setDialog({ type, fromToggle: false })}
              >
                <Plus aria-hidden="true" className="h-4 w-4" />
                {METHOD_DISPLAY[type].addLabel}
              </CustomButton>
            )}
          </SettingsRow>
        );
      })}

      <PaymentMethodDialog
        state={dialog}
        existing={dialog ? byType.get(dialog.type) : undefined}
        onClose={() => setDialog(null)}
      />
    </>
  );
}
