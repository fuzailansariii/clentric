"use client";

import { useId, useRef, useState, useTransition } from "react";
import { LoaderCircleIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/input";
import { submitContactForm } from "@/app/contact/actions";
import { LEGAL } from "@/lib/legal-config";

export function ContactForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();
  const statusId = useId();

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);
    setSent(false);

    startTransition(async () => {
      const result = await submitContactForm(formData);
      if (result.success) {
        setSent(true);
        formRef.current?.reset();
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      noValidate
      className="border-border bg-card mt-6 space-y-4 rounded-xl border p-5 sm:p-6"
    >
      <Field
        name="name"
        label="Your name"
        autoComplete="name"
        maxLength={100}
        required
        disabled={isPending}
      />

      <Field
        name="email"
        type="email"
        label="Your email"
        autoComplete="email"
        maxLength={254}
        required
        disabled={isPending}
      />

      <Field
        name="message"
        multiline
        label="How can we help?"
        rows={6}
        maxLength={5000}
        required
        disabled={isPending}
      />

      {/* Honeypot. Real visitors never see it or tab into it; bots that fill
          every field they find give themselves away. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-[9999px] h-px w-px overflow-hidden opacity-0"
      >
        <label htmlFor="website">Website</label>
        <input
          id="website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Button
          type="submit"
          size="lg"
          disabled={isPending}
          aria-describedby={statusId}
        >
          {isPending && <LoaderCircleIcon className="animate-spin" />}
          {isPending ? "Sending…" : "Send message"}
        </Button>

        <p
          id={statusId}
          role="status"
          aria-live="polite"
          className="text-muted-foreground min-h-5 text-sm"
        >
          {sent && !error
            ? "Thanks — your message is on its way. We reply " +
              LEGAL.responseTime +
              "."
            : ""}
          {error ? <span className="text-danger-600">{error}</span> : null}
        </p>
      </div>
    </form>
  );
}
