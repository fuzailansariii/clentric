"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { Dialog as DialogPrimitive } from "radix-ui";
import { ArrowRightIcon, CheckIcon, LoaderCircleIcon, XIcon } from "lucide-react";
import { joinAgencyWaitlist } from "@/app/actions/waitlist";
import { DialogOverlay, DialogPortal } from "@/components/ui/dialog";
import { LEGAL } from "@/lib/legal-config";
import { PRICING } from "@/lib/plans";
import { cn } from "@/lib/utils";
import { BTN_PRIMARY, Honeypot } from "./parts";

/** Agency waitlist: the plan is not live yet. */
export function WaitlistDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(open) => !open && onClose()}
    >
      <DialogPortal>
        <DialogOverlay className="bg-[rgba(10,12,22,.5)] backdrop-blur-sm" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="lp bg-card text-foreground fixed top-1/2 left-1/2 z-50 max-h-[calc(100vh-40px)] w-[calc(100%-40px)] max-w-115 -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-[14px] border p-7 shadow-[0_40px_90px_-30px_rgba(0,0,0,.45)] outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95"
        >
          {/* Remounts per open, so a reopened dialog starts fresh. */}
          {open && <WaitlistDialogBody onClose={onClose} />}
          <DialogPrimitive.Close
            aria-label="Close"
            className="text-muted-foreground hover:text-foreground absolute top-3 right-3 grid size-11 cursor-pointer place-items-center rounded-md hover:bg-(--lp-hover)"
          >
            <XIcon className="size-4.5" aria-hidden="true" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPortal>
    </DialogPrimitive.Root>
  );
}

function WaitlistDialogBody({ onClose }: { onClose: () => void }) {
  const [email, setEmailState] = useState("");
  const [website, setWebsite] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();
  const id = useId();

  const setEmail = (value: string) => {
    setEmailState(value);
    setError(null);
  };

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await joinAgencyWaitlist({ email, website });
      if (result.success) setSent(true);
      else setError(result.error);
    });
  };

  if (sent) {
    return (
      <div role="status" className="flex flex-col items-start gap-3 pt-2">
        <span className="grid size-12 place-items-center rounded-full bg-(--lp-success-bg) text-(--lp-success-fg) animate-[lp-in_.4s_both]">
          <CheckIcon className="size-5.5" strokeWidth={2.2} aria-hidden="true" />
        </span>
        <DialogPrimitive.Title className="font-space mt-1 text-3xl leading-[1.1] font-medium tracking-[-0.035em]">
          You&rsquo;re on the list.
        </DialogPrimitive.Title>
        <p className="text-[15.5px] text-pretty text-(--lp-muted)">
          We&rsquo;ll email{" "}
          <span className="text-foreground font-medium [overflow-wrap:anywhere]">
            {email}
          </span>{" "}
          when the Agency plan opens.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="bg-card mt-2 h-11.5 cursor-pointer rounded-md border border-(--lp-border-strong) px-5 text-[15px] font-medium hover:bg-(--lp-hover)"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <>
      <span className="font-space inline-flex h-6 items-center rounded-full bg-(--lp-accent-bg) px-2.5 text-[12.5px] font-medium text-(--lp-accent-fg)">
        Coming soon
      </span>
      <DialogPrimitive.Title className="font-space mt-3.5 text-3xl leading-[1.1] font-medium tracking-[-0.035em]">
        Join the Agency waitlist
      </DialogPrimitive.Title>
      <p className="mt-2 text-[15.5px] text-pretty text-(--lp-muted)">
        The Agency plan launches {PRICING.agency.launchLabel}. Leave your
        email and we&rsquo;ll write to you when it opens.
      </p>

      <form onSubmit={submit} noValidate className="mt-5.5 flex flex-col gap-4.5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-email`} className="text-sm font-medium">
            Email
          </label>
          <input
            id={`${id}-email`}
            type="email"
            required
            autoComplete="email"
            autoFocus
            placeholder="you@studio.com"
            value={email}
            disabled={pending}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-background focus-visible:outline-primary h-12 rounded-md border border-(--lp-border-strong) px-3.5 text-base placeholder:text-(--lp-muted) focus-visible:outline-2 focus-visible:outline-offset-2"
          />
          {error && (
            <p
              id={`${id}-error`}
              role="alert"
              className="text-[13px] text-(--lp-danger-fg)"
            >
              {error}
            </p>
          )}
        </div>

        <Honeypot id={`${id}-website`} value={website} onChange={setWebsite} />

        <button
          type="submit"
          disabled={pending}
          className={cn(BTN_PRIMARY, "h-12.5 justify-center disabled:opacity-70")}
        >
          {pending ? (
            <>
              <LoaderCircleIcon className="size-4 animate-spin" aria-hidden="true" />
              Joining…
            </>
          ) : (
            <>
              Join the Agency waitlist
              <ArrowRightIcon className="size-4" aria-hidden="true" />
            </>
          )}
        </button>
        <p className="text-[13px] text-(--lp-muted)">
          No card, no demo call. We only use your email for this.{" "}
          <Link
            href={LEGAL.routes.privacy}
            className="underline underline-offset-2 hover:text-foreground"
          >
            Privacy Policy
          </Link>
        </p>
      </form>
    </>
  );
}
