"use client";

import { ErrorState } from "@/components/error-state";
import { logClientError } from "@/lib/log-client-error";
import { useEffect } from "react";

export default function ClientsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logClientError("clients", error.message, error.digest);
  }, [error]);

  return (
    <ErrorState
      title="Couldn't load your clients"
      message="Something went wrong. Please try again."
      onRetry={reset}
    />
  );
}
