"use client";

import { useState, useTransition, type SubmitEventHandler } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { unsubscribeFromWaitlist } from "@/app/actions/waitlist";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function UnsubscribeForm({
  initialEmail,
}: {
  initialEmail: string;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  const onSubmit: SubmitEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await unsubscribeFromWaitlist({ email });
      if (result.success) {
        setDone(true);
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <div className="bg-background text-foreground relative flex min-h-screen flex-col items-center justify-center px-5 py-12">
      <div className="absolute top-5 right-5">
        <ThemeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="border-border bg-card w-full max-w-sm rounded-xl border p-7 text-center"
      >
        <span className="bg-primary text-primary-foreground font-space mx-auto mb-5 flex size-8 items-center justify-center rounded-md text-sm font-bold">
          C
        </span>

        {done ? (
          <>
            <h1 className="font-space text-lg font-semibold">
              You&rsquo;re off the list
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              {email ? (
                <>{email} won&rsquo;t hear from us again.</>
              ) : (
                "You won't hear from us again."
              )}
            </p>
          </>
        ) : (
          <>
            <h1 className="font-space text-lg font-semibold">
              Leave the waitlist
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Enter the email you signed up with — we&rsquo;ll take it off
              the list.
            </p>
            <form onSubmit={onSubmit} noValidate className="mt-5 flex flex-col gap-3">
              <label htmlFor="unsubscribe-email" className="sr-only">
                Email address
              </label>
              <input
                id="unsubscribe-email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@studio.com"
                value={email}
                disabled={isPending}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                className="border-border bg-background text-foreground focus-visible:border-ring focus-visible:ring-ring/20 rounded-md border px-3.5 py-2.5 text-sm outline-none focus-visible:ring-3"
              />
              {error && <p className="text-danger-600 text-xs">{error}</p>}
              <button
                type="submit"
                disabled={isPending}
                className="bg-secondary text-secondary-foreground font-space hover:bg-accent cursor-pointer rounded-md px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? "Unsubscribing…" : "Unsubscribe"}
              </button>
            </form>
          </>
        )}

        <Link
          href="/"
          className="text-muted-foreground mt-6 inline-block text-xs hover:underline"
        >
          ← Back to Clentric
        </Link>
      </motion.div>
    </div>
  );
}
