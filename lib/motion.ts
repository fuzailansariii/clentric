import type { Variants } from "motion/react";

export const EASE_OUT = [0.2, 0.7, 0.2, 1] as const;

/** Fade and rise in, staggered by `custom` (the item's place); capped so long lists don't wait. */
export const rise: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: (index: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.26,
      ease: EASE_OUT,
      delay: Math.min(index, 12) * 0.03,
    },
  }),
};   
