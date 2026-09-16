"use client";

import { useId, useState, useTransition, type SubmitEventHandler } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRightIcon, CheckIcon, LoaderCircleIcon } from "lucide-react";
import { joinWaitlist } from "@/app/actions/waitlist";
import { cn } from "@/lib/utils";

type Source = "x" | "reddit" | "other";

const SOURCE_OPTIONS: { value: Source; label: string }[] = [
  { value: "x", label: "X" },
  { value: "reddit", label: "Reddit" },
  { value: "other", label: "Somewhere else" },
];

type WaitlistFormProps = {
  /** "start" for a left-aligned hero, "center" for a centered call-to-action. */
  align?: "start" | "center";
  className?: string;
  /** Called once a signup succeeds — lets the page bump its waiting count. */
  onJoined?: () => void;
};

export default function WaitlistForm({
  align = "start",
  className,
  onJoined,
}: WaitlistFormProps) {
  const [email, setEmail] = useState("");
  const [source, setSource] = useState<Source | "">("");
  // Honeypot value — real visitors never see the field (see below).
  const [website, setWebsite] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const inputId = useId();
  const sourceLabelId = useId();

  const onSubmit: SubmitEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await joinWaitlist({
        email,
        source: source || undefined,
        website,
      });
      if (result.success) {
        setSubmitted(true);
        onJoined?.();
      } else {
        setError(result.error);
      }
    });
  };

  if (submitted) {
    return (
      <motion.div
        role="status"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "border-success-600/30 bg-success-600/10 flex items-center gap-3 rounded-xl border px-4 py-3.5",
          align === "center" && "justify-center",
          className,
        )}
      >
        <span className="bg-success-600 flex size-6 shrink-0 items-center justify-center rounded-full text-white">
          <CheckIcon className="size-3.5" aria-hidden="true" />
        </span>
        <p className="text-sm">
          <span className="font-medium">You&rsquo;re on the list.</span>{" "}
          <span className="text-muted-foreground">
            One email at launch, nothing else.
          </span>
        </p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className={className}>
      {/* On phones the input and button stack as two full-width controls;
          from sm up they merge into one bordered field with the button
          inside it, and the focus ring moves to that outer field. */}
      <div
        className={cn(
          "flex flex-col gap-2",
          "sm:bg-card sm:flex-row sm:items-center sm:gap-1.5 sm:rounded-xl sm:border sm:p-1.5 sm:shadow-sm sm:transition-[border-color,box-shadow]",
          "sm:focus-within:border-ring sm:focus-within:ring-ring/15 sm:focus-within:ring-3",
          error ? "sm:border-danger-600" : "sm:border-border",
        )}
      >
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
          value={email}
          disabled={isPending}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) setError(null);
          }}
          className={cn(
            "bg-card text-foreground placeholder:text-muted-foreground h-12 min-w-0 rounded-xl border px-4 text-[15px] transition-[border-color,box-shadow] outline-none",
            "focus-visible:border-ring focus-visible:ring-ring/15 focus-visible:ring-3",
            "sm:h-10 sm:flex-1 sm:rounded-lg sm:border-0 sm:bg-transparent sm:px-3 sm:focus-visible:ring-0",
            error ? "border-danger-600" : "border-border",
          )}
        />
        <button
          type="submit"
          disabled={isPending}
          className="bg-primary text-primary-foreground font-space inline-flex h-12 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl px-5 text-[15px] font-semibold transition-[filter,transform] enabled:hover:brightness-110 enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 sm:h-10 sm:rounded-lg sm:px-4 sm:text-sm"
        >
          {isPending ? (
            <>
              <LoaderCircleIcon className="size-4 animate-spin" aria-hidden="true" />
              Joining…
            </>
          ) : (
            <>
              Get early access
              <ArrowRightIcon className="size-4" aria-hidden="true" />
            </>
          )}
        </button>

        {/* Honeypot — clipped out of sight (sr-only, not display:none, which
            the simplest bots skip) and removed from the accessibility tree
            and tab order, so no real visitor, sighted or not, ever fills it. */}
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
      </div>

      <AnimatePresence initial={false}>
        {error && (
          <motion.p
            id={`${inputId}-error`}
            role="alert"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className={cn(
              "text-danger-600 overflow-hidden pt-2 text-[13px]",
              align === "center" && "text-center",
            )}
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Optional. A labelled group of toggle chips rather than a <fieldset>
          with <legend> — legends don't take part in flex layout, which is
          what knocked the old label out of line with its options. */}
      <div
        role="group"
        aria-labelledby={sourceLabelId}
        className={cn(
          "mt-3 flex flex-wrap items-center gap-1.5",
          align === "center" && "justify-center",
        )}
      >
        <span id={sourceLabelId} className="text-muted-foreground mr-1 text-xs">
          How did you find us?
        </span>
        {SOURCE_OPTIONS.map((opt) => {
          const selected = source === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              disabled={isPending}
              aria-pressed={selected}
              onClick={() => setSource(selected ? "" : opt.value)}
              className={cn(
                "inline-flex h-7 cursor-pointer items-center gap-1 rounded-full border px-2.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                selected
                  ? "border-primary/40 bg-primary/10 text-foreground"
                  : "border-border text-muted-foreground hover:border-foreground/25 hover:text-foreground",
              )}
            >
              {selected && <CheckIcon className="size-3" aria-hidden="true" />}
              {opt.label}
            </button>
          );
        })}
      </div>
    </form>
  );
}
