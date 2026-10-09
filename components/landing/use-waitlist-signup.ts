"use client";

import { useState, useTransition, type FormEvent } from "react";
import { joinAgencyWaitlist, joinWaitlist } from "@/app/actions/waitlist";
import type { WaitlistKind } from "./waitlist-context";

/** Form state shared by the waitlist dialog and the inline signup. */
export function useWaitlistSignup(kind: WaitlistKind, source?: string) {
  const [email, setEmailState] = useState("");
  const [website, setWebsite] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  const setEmail = (value: string) => {
    setEmailState(value);
    setError(null);
  };

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result =
        kind === "agency"
          ? await joinAgencyWaitlist({ email, website })
          : await joinWaitlist({ email, source: source || undefined, website });
      if (result.success) setSent(true);
      else setError(result.error);
    });
  };

  return { email, setEmail, website, setWebsite, error, sent, pending, submit };
}
