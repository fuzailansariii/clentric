"use client";

import { useState, type ComponentProps } from "react";
import { MotionConfig, motion } from "motion/react";
import { useEnterInitial } from "@/components/ui/rise";
import { EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * A track whose fill grows from the left to `value` (0 to 1), and follows
 * later changes. `delay` staggers the entrance only, never an update.
 */
export function FillBar({
  value,
  fillClassName,
  delay = 0,
  className,
  ...props
}: ComponentProps<"span"> & {
  value: number;
  fillClassName: string;
  delay?: number;
}) {
  const enter = useEnterInitial();
  const [entering, setEntering] = useState(true);

  return (
    <MotionConfig reducedMotion="user">
      <span className={cn("block overflow-hidden", className)} {...props}>
        <motion.span
          className={cn("block h-full origin-left", fillClassName)}
          initial={enter ? { scaleX: 0 } : false}
          animate={{ scaleX: Math.min(Math.max(value, 0), 1) }}
          transition={{
            duration: 0.5,
            ease: EASE_OUT,
            delay: entering ? delay : 0,
          }}
          onAnimationComplete={() => setEntering(false)}
        />
      </span>
    </MotionConfig>
  );
}
