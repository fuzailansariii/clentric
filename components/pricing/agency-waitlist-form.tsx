"use client";

import { useId, useState, useTransition, type SubmitEventHandler } from "react";
import { CheckIcon, LoaderCircleIcon } from "lucide-react";
import { joinAgencyWaitlist } from "@/app/actions/waitlist";
import { cn } from "@/lib/utils";

/**
 * Email form for the Agency waitlist. Styled for the dark Agency card, so it
 * uses fixed light-on-dark colours rather than theme tokens.
 */
export function AgencyWaitlistForm({
  autoFocus = false,
}: {
  autoFocus?: boolean;
}) {
  const [email, setEmail] = useState("");
  // Honeypot value — real visitors never see the field (see below).
  const [website, setWebsite] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const inputId = useId();

  const onSubmit: SubmitEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await joinAgencyWaitlist({ email, website });
      if (result.success) {
        setSubmitted(true);
      } else {
        setError(result.error);
      }
    });
  };

  if (submitted) {
    return (
      <p
        role="status"
        className="flex items-center gap-2.5 rounded-lg border border-white/15 bg-white/5 px-3.5 py-3 text-sm"
      >
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-white text-[#0b0b0c]">
          <CheckIcon className="size-3" aria-hidden="true" />
        </span>
        You&rsquo;re on the Agency list. We&rsquo;ll email you when it opens.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-2">
      <label htmlFor={inputId} className="sr-only">
        Email address
      </label>
      <input
        id={inputId}
        type="email"
        required
        autoComplete="email"
        inputMode="email"
        placeholder="you@studio.com"
        autoFocus={autoFocus}
        value={email}
        disabled={isPending}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${inputId}-error` : undefined}
        onChange={(e) => {
          setEmail(e.target.value);
          if (error) setError(null);
        }}
        className={cn(
          "h-11 min-w-0 rounded-lg border bg-white/5 px-3.5 text-[15px] text-white outline-none placeholder:text-white/45",
          "focus-visible:border-white/60 focus-visible:ring-3 focus-visible:ring-white/20",
          error ? "border-red-400" : "border-white/15",
        )}
      />
      <button
        type="submit"
        disabled={isPending}
        className="font-space inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-[#0b0b0c] transition-colors enabled:hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? (
          <>
            <LoaderCircleIcon
              className="size-4 animate-spin"
              aria-hidden="true"
            />
            Joining…
          </>
        ) : (
          "Join the Agency waitlist"
        )}
      </button>

      {/* Honeypot — clipped out of sight and out of the tab order, as in the
          main waitlist form. */}
      <div className="sr-only" aria-hidden="true">
        <label htmlFor={`${inputId}-website`}>Website</label>
        <input
          id={`${inputId}-website`}
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      {error && (
        <p
          id={`${inputId}-error`}
          role="alert"
          className="text-[13px] text-red-300"
        >
          {error}
        </p>
      )}
    </form>
  );
}
