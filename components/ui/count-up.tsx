"use client";

import { useEffect, useState } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { useHydrated } from "@/hooks/use-hydrated";
import { formatCurrencyWhole } from "@/lib/format-currency";
import { EASE_OUT } from "@/lib/motion";

/**
 * A whole-currency amount that counts up from 0 when it mounts in the browser.
 * On the first server-rendered load it shows the final value straight away.
 */
export function CountUp({
  value,
  currency,
}: {
  value: number;
  currency: string;
}) {
  const hydrated = useHydrated();
  const reduce = useReducedMotion();
  // Decided once, at mount: animate only when there was no server-rendered value.
  const [fromZero] = useState(hydrated && !reduce);
  const amount = useMotionValue(fromZero ? 0 : value);
  const text = useTransform(amount, (v) =>
    formatCurrencyWhole(String(Math.round(v)), currency),
  );

  useEffect(() => {
    if (!fromZero) {
      amount.set(value);
      return;
    }
    const controls = animate(amount, value, { duration: 0.9, ease: EASE_OUT });
    return () => controls.stop();
  }, [amount, fromZero, value]);

  return <motion.span className="tabular-nums">{text}</motion.span>;
}
