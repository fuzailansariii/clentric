"use client";

import { useEffect } from "react";
import { CustomButton } from "@/components/ui/custom-button";

export default function ClientsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="border-border flex min-h-40 flex-col items-center justify-center gap-3 rounded-xl border px-6 py-12 text-center">
      <p className="text-sm font-medium">Couldn't load your clients.</p>
      <p className="text-muted-foreground text-xs">
        Something went wrong. Try again, or refresh the page.
      </p>
      <CustomButton variant="secondary" onClick={() => reset()}>
        Try again
      </CustomButton>
    </div>
  );
}
