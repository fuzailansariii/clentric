"use client";

import { useLinkStatus } from "next/link";
import { cn } from "@/lib/utils";

/**
 * Thin bar across the top of the screen while the Link it sits in is navigating.
 * Place it anywhere inside a <Link>; it renders fixed, so the link's layout never changes.
 */
export function LinkProgress() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden="true"
      className={cn(
        "bg-primary pointer-events-none fixed inset-x-0 top-0 z-100 h-0.5 origin-left shadow-[0_0_10px_color-mix(in_srgb,var(--primary)_70%,transparent)]",
        // When done it snaps to full width and fades, so the finish reads as "arrived".
        pending
          ? "animate-[link-progress_10s_cubic-bezier(.08,.8,.2,1)_forwards] motion-reduce:scale-x-50 motion-reduce:animate-none"
          : "opacity-0 transition-opacity delay-100 duration-300",
      )}
    />
  );
}
