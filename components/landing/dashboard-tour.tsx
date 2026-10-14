"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { SECTION, SectionHead } from "./parts";

type Box = { l: number; t: number; w: number; h: number };

// Boxes are percentages of the screenshots in public/landing.
const SPOTS: { label: string; title: string; body: string; wide: Box; phone: Box }[] = [
  {
    label: "Needs you",
    title: "Needs your attention",
    body: "Overdue invoices, payments your clients say they've made and proposals about to expire sit at the top, one click from sorted.",
    wide: { l: 21.7, t: 16.8, w: 76, h: 24.4 },
    phone: { l: 1.4, t: 20.3, w: 97.2, h: 29.7 },
  },
  {
    label: "Money",
    title: "Your money, in one line",
    body: "Paid this month, outstanding, overdue and proposals waiting on a reply. No reports to build.",
    wide: { l: 21.7, t: 42.7, w: 76, h: 15.4 },
    phone: { l: 1.4, t: 51.7, w: 97.2, h: 23.7 },
  },
  {
    label: "Workspace",
    title: "Everything one click away",
    body: "Clients, proposals, projects and invoices, with a count on anything waiting for you.",
    wide: { l: 0.5, t: 7.4, w: 16.8, h: 28.2 },
    phone: { l: 0.8, t: 0.4, w: 98.4, h: 6.2 },
  },
];

const EASE = "cubic-bezier(.65,0,.25,1)";
const MOVE = ["left", "top", "width", "height", "transform"].map((p) => `${p} .8s ${EASE}`).join(", ");

export function DashboardTour() {
  const [spot, setSpot] = useState(0);

  return (
    <section id="dashboard" aria-labelledby="dash-h" className={SECTION}>
      <SectionHead
        eyebrow="The dashboard"
        title="Open it with your coffee. Done before it's cold."
        titleId="dash-h"
        titleClassName="max-w-[15ch]"
        aside={
          <SegmentedControl
            label="Dashboard areas"
            variant="chips"
            value={String(spot)}
            onChange={(v) => setSpot(Number(v))}
            className="gap-1.5"
            itemClassName="aria-[pressed=false]:border-(--lp-border-strong)"
            options={SPOTS.map((s, i) => ({ value: String(i), label: s.label }))}
          />
        }
      />

      <div data-rv="120" className="bg-card mt-10 overflow-hidden rounded-2xl border shadow-(--lp-lift)">
        <div aria-hidden="true" className="flex h-10 items-center gap-3 border-b px-3.5">
          <span className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <span key={i} className="size-2.5 rounded-full bg-(--lp-border-strong)" />
            ))}
          </span>
          <span className="mx-auto flex h-6 max-w-70 flex-1 items-center justify-center rounded-md bg-(--lp-hover) text-xs text-(--lp-muted)">
            clentric.app/dashboard
          </span>
          <span className="w-10.5" />
        </div>
        <Shot name="dashboard" width={1440} height={900} box={SPOTS[spot].wide} className="max-sm:hidden" />
        <Shot
          name="dashboard-phone"
          width={390}
          height={844}
          visible={620 / 844}
          box={SPOTS[spot].phone}
          className="sm:hidden"
        />
      </div>

      <div role="tabpanel" aria-live="polite" className="mt-7 grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] gap-x-12 gap-y-3">
        <div className="font-space text-[22px] font-medium tracking-[-0.02em]">{SPOTS[spot].title}</div>
        <p className="max-w-[52ch] text-[16.5px] text-pretty text-(--lp-muted)">{SPOTS[spot].body}</p>
      </div>
    </section>
  );
}

/**
 * A light/dark screenshot with a spotlight on `box`. With `visible` < 1 the
 * frame shows only that share of the height and pans to keep the spot in view.
 */
function Shot({
  name,
  width,
  height,
  box,
  visible = 1,
  className,
}: {
  name: string;
  width: number;
  height: number;
  box: Box;
  visible?: number;
  className?: string;
}) {
  const pan = Math.min(0, Math.max(-(1 - visible) * 100, visible * 50 - (box.t + box.h / 2)));
  const alt = "The Clentric dashboard with sample data";
  const img = "block h-auto w-full";

  return (
    <div
      className={cn("relative overflow-hidden bg-(--lp-sunk)", className)}
      style={{ aspectRatio: `${width} / ${height * visible}` }}
    >
      <div style={{ transform: `translateY(${pan}%)`, transition: MOVE }}>
        <Image src={`/landing/${name}-light.png`} alt={alt} width={width} height={height} sizes="(max-width: 1240px) 100vw, 1160px" className={cn(img, "dark:hidden")} />
        <Image src={`/landing/${name}-dark.png`} alt={alt} width={width} height={height} sizes="(max-width: 1240px) 100vw, 1160px" className={cn(img, "hidden dark:block")} />
      </div>
      <div
        aria-hidden="true"
        className="border-primary pointer-events-none absolute z-2 rounded-[10px] border-2 shadow-[0_0_0_9999px_rgba(10,12,22,.42),0_0_0_6px_color-mix(in_srgb,var(--primary)_22%,transparent)]"
        style={{
          left: `${box.l}%`,
          width: `${box.w}%`,
          top: `${(box.t + pan) / visible}%`,
          height: `${box.h / visible}%`,
          transition: MOVE,
        }}
      />
    </div>
  );
}
