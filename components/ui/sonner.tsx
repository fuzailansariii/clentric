"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
} from "lucide-react";
import { IconTile } from "@/components/ui/icon-tile";

// 36px tile with an 18px glyph: a toast is read at a glance, so a bit larger than list rows.
const GLYPH = "[&_svg]:size-4.5";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      // Top right so a notification arriving on its own is noticed rather
      // than competing with the bottom of a long form. Applies to action
      // toasts too, which keeps every toast in one predictable place.
      position="top-right"
      className="toaster group"
      // Same tinted tiles as the list rows, so a toast reads like the app.
      icons={{
        success: (
          <IconTile tone="success" size="md" className={GLYPH}>
            <CircleCheckIcon />
          </IconTile>
        ),
        info: (
          <IconTile tone="info" size="md" className={GLYPH}>
            <InfoIcon />
          </IconTile>
        ),
        warning: (
          <IconTile tone="warning" size="md" className={GLYPH}>
            <TriangleAlertIcon />
          </IconTile>
        ),
        error: (
          <IconTile tone="danger" size="md" className={GLYPH}>
            <OctagonXIcon />
          </IconTile>
        ),
        loading: (
          <IconTile tone="neutral" size="md" className={GLYPH}>
            <Loader2Icon className="animate-spin" />
          </IconTile>
        ),
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "font-sans flex w-(--width) items-start gap-2.5 rounded-xl border border-border bg-popover p-2.5 pr-3 text-popover-foreground shadow-lg shadow-black/5 dark:shadow-black/40",
          // relative: sonner centres its spinner in the nearest positioned box.
          icon: "relative m-0! size-9! shrink-0",
          content: "flex min-w-0 flex-1 flex-col gap-0.5 py-2",
          title: "text-sm leading-5 font-medium",
          description: "text-muted-foreground text-xs leading-relaxed break-words",
          actionButton:
            "self-center shrink-0 cursor-pointer rounded-lg border border-border bg-secondary px-2.5 h-8 text-xs font-medium text-foreground transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          cancelButton:
            "self-center shrink-0 cursor-pointer rounded-lg px-2 h-8 text-xs font-medium text-muted-foreground hover:text-foreground",
          default: "pl-3.5",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
