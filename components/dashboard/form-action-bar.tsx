"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { FieldValues, UseFormReturn } from "react-hook-form";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { CustomButton } from "@/components/ui/custom-button";

/** After a save: mark the form clean, then go, so the leave guard stays off on the way out. */
export function useLeaveAfterSave<T extends FieldValues>(
  form: Pick<UseFormReturn<T>, "reset" | "getValues">,
) {
  const router = useRouter();
  return (href: string) => {
    form.reset(form.getValues());
    router.push(href);
  };
}

/**
 * The save buttons of a new/edit page, pinned to the bottom of the content
 * area. Leaving with unsaved changes asks first: Cancel, any in-app link, or the tab.
 */
export function FormActionBar({
  isDirty,
  isPending = false,
  cancelHref,
  children,
}: {
  isDirty: boolean;
  isPending?: boolean;
  cancelHref: string;
  /** The save buttons, primary last. */
  children: ReactNode;
}) {
  const router = useRouter();
  // Where the person was heading when we stopped them to ask.
  const [leaveTo, setLeaveTo] = useState<string | null>(null);
  const guard = isDirty && !isPending;

  // Reloads and closing the tab.
  useEffect(() => {
    if (!guard) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [guard]);

  // In-app links (back arrow, sidebar, breadcrumbs) are client navigations, so
  // catch their clicks before next/link does.
  useEffect(() => {
    if (!guard) return;
    const onClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      const link = (event.target as Element | null)?.closest("a[href]");
      if (!(link instanceof HTMLAnchorElement)) return;
      if (link.target === "_blank" || link.hasAttribute("download")) return;
      const url = new URL(link.href);
      if (url.origin !== window.location.origin) return;
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      ) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      setLeaveTo(url.pathname + url.search + url.hash);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [guard]);

  const cancel = () => {
    if (guard) setLeaveTo(cancelHref);
    else router.push(cancelHref);
  };

  return (
    <>
      <div className="bg-background/95 supports-backdrop-filter:bg-background/80 sticky bottom-0 z-20 mt-auto border-t backdrop-blur">
        {/* On narrow phones the last button wraps to its own row rather than clip. */}
        <div className="flex items-center gap-2 px-4 py-3 max-sm:flex-wrap sm:px-5 lg:px-10 [&>button]:whitespace-nowrap [&>button]:max-sm:h-11 [&>button]:max-sm:flex-auto">
          {/* Always mounted so screen readers announce the text when it appears. */}
          <span
            role="status"
            className="text-muted-foreground mr-auto hidden text-sm sm:inline"
          >
            {guard ? "Unsaved changes" : null}
          </span>
          <CustomButton
            type="button"
            variant="secondary"
            size="sm"
            onClick={cancel}
            disabled={isPending}
          >
            Cancel
          </CustomButton>
          {children}
        </div>
      </div>
      <ConfirmDialog
        open={leaveTo !== null}
        onOpenChange={(open) => !open && setLeaveTo(null)}
        title="Discard your changes?"
        description="What you typed on this page hasn't been saved and will be lost."
        confirmLabel="Discard changes"
        variant="destructive"
        onConfirm={() => {
          if (leaveTo) router.push(leaveTo);
        }}
      />
    </>
  );
}
