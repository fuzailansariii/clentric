"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { CustomButton } from "@/components/ui/custom-button";
import { manageBillingAction, startCheckoutAction } from "./billing-actions";

type Option = { interval: "monthly" | "yearly"; label: string };

/** Sends the user to the hosted checkout; nothing changes here until the webhook. */
export function UpgradeButtons({ options }: { options: Option[] }) {
  const [pending, startTransition] = useTransition();
  const [chosen, setChosen] = useState<Option["interval"] | null>(null);
  // Back from checkout and still confirming: a second click could pay twice.
  const returning = useSearchParams().get("checkout") === "success";

  const start = (interval: Option["interval"]) => {
    setChosen(interval);
    startTransition(async () => {
      const result = await startCheckoutAction({ interval });
      if (result.success) {
        window.location.assign(result.data.url);
      } else {
        toast.error(result.error);
        setChosen(null);
      }
    });
  };

  if (returning) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option, i) => (
        <CustomButton
          key={option.interval}
          type="button"
          variant={i === 0 ? "primary" : "secondary"}
          disabled={pending}
          onClick={() => start(option.interval)}
        >
          {pending && chosen === option.interval ? "Opening checkout…" : option.label}
        </CustomButton>
      ))}
    </div>
  );
}

/** Opens the payment provider's portal: card, invoices, cancel. */
export function ManageBillingButton({ variant = "secondary" }: { variant?: "primary" | "secondary" }) {
  const [pending, startTransition] = useTransition();

  return (
    <CustomButton
      type="button"
      variant={variant}
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await manageBillingAction();
          if (result.success) window.location.assign(result.data.url);
          else toast.error(result.error);
        })
      }
    >
      {pending ? "Opening…" : "Manage billing"}
    </CustomButton>
  );
}

const POLL_MS = 3_000;
const POLL_FOR_MS = 30_000;

/**
 * After checkout the provider sends the user back here. Landing proves
 * nothing: re-check every 3 s for up to 30 s until the webhook has run.
 */
export function CheckoutReturn({ isPro }: { isPro: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const returned = params.get("checkout") === "success";
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!returned || isPro) return;
    const started = Date.now();
    const timer = setInterval(() => {
      if (Date.now() - started >= POLL_FOR_MS) {
        clearInterval(timer);
        setTimedOut(true);
        return;
      }
      router.refresh();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [returned, isPro, router]);

  if (!returned) return null;

  const message = isPro
    ? "You're on Pro. Thanks for supporting Clentric."
    : timedOut
      ? "Still waiting for the payment to confirm. If you paid, Pro will show up here shortly; if you closed checkout, nothing was charged."
      : "Confirming your payment, activating Pro…";

  return (
    <p role="status" className="bg-secondary/40 rounded-lg border px-4 py-3 text-sm">
      {message}
      {timedOut && !isPro && (
        <>
          {" "}
          <Link href="/settings/billing" className="font-medium underline-offset-4 hover:underline">
            Back to plans
          </Link>
        </>
      )}
    </p>
  );
}
