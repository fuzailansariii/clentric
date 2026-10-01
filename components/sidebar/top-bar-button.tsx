"use client";

import type { ComponentProps } from "react";
import { MotionConfig, motion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Icon button for the mobile top bar: 44px tap target, the sidebar's hover
 * and open colours, and a small press-in on tap. Works as a Radix
 * `asChild` trigger (React 19 passes the ref through as a prop).
 */
export function TopBarButton({
  className,
  ...props
}: ComponentProps<typeof motion.button>) {
  return (
    // Drops the press-in when the OS asks for reduced motion.
    <MotionConfig reducedMotion="user">
      <motion.button
        type="button"
        whileTap={{ scale: 0.9 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className={cn(
          "text-muted-foreground flex size-11 cursor-pointer items-center justify-center rounded-lg transition-colors",
          "hover:bg-sidebar-accent/50 hover:text-foreground",
          "data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground",
          "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
          className,
        )}
        {...props}
      />
    </MotionConfig>
  );
}
