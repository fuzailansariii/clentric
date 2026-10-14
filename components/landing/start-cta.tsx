"use client";

import type { CSSProperties, MouseEvent, ReactNode } from "react";
import Link from "next/link";
import { ArrowRightIcon, BellIcon, CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { BTN_PRIMARY, H2, SECTION, Tick } from "./parts";

export function StartCta() {
  // Glow follows the pointer; CSS vars avoid a re-render per move.
  const glow = (e: MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  return (
    <section id="start" aria-labelledby="start-h" className={SECTION}>
      <div
        data-rv="0"
        onMouseMove={glow}
        className="bg-card @container relative overflow-hidden rounded-2xl border shadow-(--lp-lift)"
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[linear-gradient(var(--lp-grid)_1px,transparent_1px)] bg-size-[32px_32px] bg-top mask-[radial-gradient(ellipse_65%_85%_at_78%_50%,#000_15%,transparent_80%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(380px_circle_at_var(--mx,78%)_var(--my,45%),color-mix(in_srgb,var(--primary)_12%,transparent),transparent_70%)]" />
          <Ring size={420} offset={-140} delay="0s" strong />
          <Ring size={660} offset={-260} delay="1.2s" />
          <Ring size={900} offset={-380} delay="2.4s" />
          <Chip pos="top-[16%] right-[5%]" r="-3deg" delay="0s">
            <CheckIcon className="size-3.75 text-(--lp-success-fg)" strokeWidth={2.4} />
            Proposal accepted
          </Chip>
          <Chip pos="top-[37%] right-[17%]" r="2deg" delay="1.4s">
            <span className="size-2 rounded-full bg-(--lp-success-fg)" />
            <span className="font-space font-semibold">INV-042</span>
            <span className="text-(--lp-muted)">Paid</span>
          </Chip>
          <Chip pos="top-[58%] right-[4%]" r="-2deg" delay=".7s">
            <BellIcon className="text-primary size-3.75" />
            Reminder sent
          </Chip>
          <Chip pos="top-[77%] right-[14%]" r="3deg" delay="2.1s">
            <span className="font-space font-semibold text-(--lp-success-fg) tabular-nums">+$3,547.50</span>
            <span className="text-(--lp-muted)">Northbeam</span>
          </Chip>
        </div>

        <div className="relative flex max-w-145 flex-col gap-5 p-[clamp(32px,6vw,80px)]">
          <span className="font-space inline-flex h-7 items-center gap-2 self-start rounded-full bg-(--lp-accent-bg) px-3 text-[13.5px] font-medium whitespace-nowrap text-(--lp-accent-fg)">
            <span className="bg-primary size-1.75 rounded-full animate-[lp-blink_1.6s_ease-in-out_infinite]" />
            Now open
          </span>
          <h2 id="start-h" className={cn(H2, "text-[clamp(38px,5vw,64px)] leading-[.95] tracking-[-0.05em]")}>
            Start <span className="text-primary">free.</span>
          </h2>
          <p className="max-w-[44ch] text-[17px] leading-[1.55] text-(--lp-muted)">
            Free covers your first client. Upgrade to Pro when the work grows.
          </p>

          <Link href="/register" className={cn(BTN_PRIMARY, "h-11 self-start max-[420px]:self-stretch max-[420px]:justify-center")}>
            Get started free
            <ArrowRightIcon className="size-4" aria-hidden="true" />
          </Link>

          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-(--lp-muted)">
            <Tick>No card needed</Tick>
            <Tick>Upgrade or cancel anytime</Tick>
          </div>
        </div>
      </div>
    </section>
  );
}

function Ring({ size, offset, delay, strong = false }: { size: number; offset: number; delay: string; strong?: boolean }) {
  return (
    <span
      className={cn(
        "absolute top-1/2 rounded-full border animate-[lp-breathe_7s_ease-in-out_infinite]",
        strong ? "border-(--lp-border-strong)" : "border-border",
      )}
      style={{ right: offset, width: size, height: size, marginTop: -size / 2, animationDelay: delay }}
    />
  );
}

function Chip({ pos, r, delay, children }: { pos: string; r: string; delay: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        "bg-card text-foreground absolute inline-flex h-10.5 items-center gap-2 rounded-[10px] border px-3.5 text-sm font-medium whitespace-nowrap shadow-(--lp-lift) animate-[lp-bob_6s_ease-in-out_infinite] @max-[1000px]:hidden",
        pos,
      )}
      style={{ "--r": r, animationDelay: delay } as CSSProperties}
    >
      {children}
    </span>
  );
}
