"use client";

import type { ReactNode } from "react";
import { MotionConfig, motion } from "motion/react";
import { useHydrated } from "@/hooks/use-hydrated";
import { rise } from "@/lib/motion";

/**
 * "hidden" when a block mounts in the browser (in-app navigation, a filter),
 * false on the first server-rendered load, so content never waits for JS to show.
 */
export function useEnterInitial(): "hidden" | false {
  return useHydrated() ? "hidden" : false;
}

/**
 * A row in an editable list (line items, stages): rises in when added and
 * slides into place when a row above it is removed. No exit animation: the
 * form tracks rows by index, so a removed row must leave at once.
 */
export function RiseRow({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const initial = useEnterInitial();
  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        layout="position"
        variants={rise}
        initial={initial}
        animate="show"
        className={className}
      >
        {children}
      </motion.div>
    </MotionConfig>
  );
}

/** Fades and rises its children in; `index` staggers siblings. */
export function Rise({
  index = 0,
  className,
  children,
}: {
  index?: number;
  className?: string;
  children: ReactNode;
}) {
  const initial = useEnterInitial();
  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        custom={index}
        variants={rise}
        initial={initial}
        animate="show"
        className={className}
      >
        {children}
      </motion.div>
    </MotionConfig>
  );
}
