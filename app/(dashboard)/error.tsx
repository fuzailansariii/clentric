"use client";

import { useEffect } from "react";
import DashboardContainer from "@/components/dashboard/container";
import { ErrorState } from "@/components/error-state";

// Catches failures in any dashboard page without its own error boundary —
// e.g. a database outage on an invoice page shows this instead of a 404.
export default function DashboardError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <DashboardContainer>
      <ErrorState
        title="This page couldn't load"
        message="Something went wrong on our side. Try again, or refresh in a moment."
        // Re-fetches the page's data, not just a re-render.
        onRetry={() => unstable_retry()}
      />
    </DashboardContainer>
  );
}
