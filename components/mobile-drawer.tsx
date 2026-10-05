"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CustomButton } from "./ui/custom-button";

type MobileDrawerProps = {
  open: boolean;
  onClose: () => void;
  /** Usually the logo; the close button sits beside it. */
  header: ReactNode;
  side?: "left" | "right";
  /** Pinned to the bottom; the children scroll above it on short screens. */
  footer?: ReactNode;
  children: ReactNode;
};

export function MobileDrawer({
  open,
  onClose,
  header,
  side = "left",
  footer,
  children,
}: MobileDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    // Kept mounted so the slide and fade can animate; `inert` keeps the
    // closed drawer out of focus and click order.
    <div
      className={cn(
        "fixed inset-0 z-50 md:hidden",
        !open && "pointer-events-none",
      )}
      inert={!open}
    >
      <div
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-black/40 backdrop-blur-[1px] transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0",
        )}
      />

      <aside
        className={cn(
          "bg-background absolute inset-y-0 flex w-[min(18.75rem,85vw)] flex-col shadow-xl transition-transform duration-300 ease-out",
          side === "left"
            ? "left-0 rounded-r-md border-r"
            : "right-0 rounded-l-md border-l",
          open
            ? "translate-x-0"
            : side === "left"
              ? "-translate-x-full"
              : "translate-x-full",
        )}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b px-4">
          {header}
          <CustomButton
            variant="ghost"
            size="md"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X className="size-5" />
          </CustomButton>
        </div>

        <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 py-5">
          {children}
        </nav>

        {footer && (
          <div className="flex shrink-0 flex-col gap-1 px-3 pb-2">{footer}</div>
        )}
      </aside>
    </div>
  );
}
