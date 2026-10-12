"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRightIcon, PauseIcon, PlayIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BTN_OUTLINE,
  BTN_PRIMARY,
  FRAME,
  LaunchPill,
  StatusPill,
  Tick,
  type Tone,
} from "./parts";
import { useOpenWaitlist } from "./waitlist-context";

const USD = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const K = (n: number) =>
  n >= 1000 ? "$" + (n / 1000).toFixed(1).replace(".0", "") + "k" : "$" + n;

const STEPS = ["Proposal", "Project", "Invoice", "Paid"];

const CAPTIONS = [
  "Your client reads the proposal on their phone and accepts in one tap.",
  "The project and its milestones set themselves up. No copying.",
  "Bill the work in a minute, and send a reminder in one click.",
  "Mark it paid and your numbers update on their own.",
];

// Sample data for the demo board; nothing here is a real account.
const COLS = ["Proposals", "Projects", "Invoices", "Paid"] as const;

// Two per column: the second peeks out under the fade, like a list that keeps going.
const STATIC: Card[][] = [
  [
    { kicker: "Proposal", title: "Menu and signage", client: "Kiln Coffee", amt: 1800, badge: "Sent", tone: "info", note: "Sent yesterday" },
    { kicker: "Proposal", title: "Seasonal packaging", client: "Fernhill Bakery", amt: 1200, badge: "Draft", tone: "neutral", note: "Edited today" },
  ],
  [
    { kicker: "Project · 3/5", title: "Specimen site", client: "Verso Type Foundry", amt: 3200, badge: "In progress", tone: "neutral", note: "QA · Oct 14" },
    { kicker: "Project · 1/4", title: "Podcast artwork", client: "Lumen Audio", amt: 900, badge: "In progress", tone: "neutral", note: "Covers · Oct 18" },
  ],
  [
    { kicker: "INV-039", title: "Retainer, September", client: "Halden & Co", amt: 960, badge: "Overdue", tone: "danger", note: "Reminder sent" },
    { kicker: "INV-040", title: "Logo files, final", client: "Tidewater Co", amt: 640, badge: "Sent", tone: "info", note: "Due Oct 20" },
  ],
  [
    { kicker: "INV-038", title: "Campaign landing", client: "Ridge Outdoor", amt: 2150, badge: "Paid", tone: "success", note: "Paid Oct 3" },
    { kicker: "INV-037", title: "Menu photography", client: "Kiln Coffee", amt: 1100, badge: "Paid", tone: "success", note: "Paid Sep 28" },
  ],
];

const JOBS = [
  { title: "Brand system, phase 2", client: "Northbeam Studio", amt: 2400, inv: "INV-042" },
  { title: "iOS onboarding flow", client: "Okapi Labs", amt: 3600, inv: "INV-043" },
  { title: "Website rebuild", client: "Marlow Press", amt: 4850, inv: "INV-044" },
];

type Card = {
  kicker: string;
  title: string;
  client: string;
  amt: number;
  badge: string;
  tone: Tone;
  note: string;
};

type Stage = {
  kicker: string;
  badge: string;
  tone: Tone;
  note: string;
  action?: string;
  pct?: string;
  frac?: string;
};

const STAGES: ((inv: string) => Stage)[] = [
  () => ({ kicker: "Proposal", badge: "Viewed", tone: "viewed", note: "Your client opened it 2h ago", action: "Client accepts" }),
  () => ({ kicker: "Project", badge: "Ready to bill", tone: "info", note: "Last milestone done, ready to invoice", action: "Send invoice", pct: "100%", frac: "3/3" }),
  (inv) => ({ kicker: inv, badge: "Sent", tone: "info", note: "Due Oct 15 · one-click reminder", action: "Client pays" }),
  (inv) => ({ kicker: inv, badge: "Paid", tone: "success", note: "Confirmed today" }),
];

export function Hero() {
  const openWaitlist = useOpenWaitlist();
  const reduce = useReducedMotion();
  const [state, setState] = useState({ stage: 0, job: 0, banked: 0 });
  const [playing, setPlaying] = useState(true);
  const [hover, setHover] = useState(false);
  const [tick, setTick] = useState(0);
  const running = playing && !reduce;

  const advance = useCallback(
    () =>
      setState((s) => {
        if (s.stage < 3) return { ...s, stage: s.stage + 1 };
        const job = (s.job + 1) % JOBS.length;
        return { stage: 0, job, banked: job === 0 ? 0 : s.banked + JOBS[s.job].amt };
      }),
    [],
  );

  // tick restarts the 2.6s timer after a manual click.
  useEffect(() => {
    if (!running || hover) return;
    const t = setInterval(() => {
      if (!document.hidden) advance();
    }, 2600);
    return () => clearInterval(t);
  }, [running, hover, tick, advance]);

  const { stage } = state;

  return (
    <section
      aria-label="Introduction"
      className={cn(FRAME, "relative px-[clamp(20px,4vw,40px)] pt-[clamp(40px,6vw,72px)] pb-[clamp(64px,7vw,104px)]")}
    >
      <div className="flex flex-col items-center text-center">
        <div data-rv="0" className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm text-(--lp-muted)">
          <LaunchPill>Early access</LaunchPill>
          Opening mid-October 2026
        </div>
        <h1
          data-rv="80"
          className="font-space mt-6 max-w-[14ch] text-[clamp(40px,5.6vw,80px)] leading-[.96] font-medium tracking-[-0.05em] text-balance"
        >
          Run your freelance business in{" "}
          <span className="text-primary">one place.</span>
        </h1>
        <p
          data-rv="160"
          className="mt-[clamp(16px,2vw,24px)] max-w-[54ch] text-[clamp(16px,1.3vw,18px)] leading-[1.6] text-pretty text-(--lp-muted)"
        >
          Proposals, projects and invoices in one workspace, each handing off to
          the next, so nothing gets copied twice or forgotten.
        </p>

        <div data-rv="200" aria-label="How a job moves through Clentric" className="relative mt-9 w-full max-w-140">
          <div aria-hidden="true" className="absolute inset-x-[12.5%] top-1.25 h-0.5 rounded-[1px] bg-(--lp-track)">
            <span
              className="bg-primary block h-full rounded-[1px] transition-[width] duration-800 ease-[cubic-bezier(.6,0,.2,1)]"
              style={{ width: `${(stage / 3) * 100}%` }}
            />
          </div>
          <ol className="relative grid grid-cols-4">
            {STEPS.map((label, i) => {
              const on = stage === i;
              const done = i < stage;
              return (
                <li key={label} className="flex flex-col items-center gap-3">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "size-3 rounded-full border-2 transition-[background,box-shadow,border-color] duration-400",
                      on || done ? "border-primary bg-primary" : "bg-background border-(--lp-border-strong)",
                      on && "shadow-[0_0_0_5px_color-mix(in_srgb,var(--primary)_18%,transparent)]",
                    )}
                  />
                  <span
                    className={cn(
                      "text-[14.5px] font-medium whitespace-nowrap transition-colors duration-400",
                      on ? "text-foreground" : done ? "text-(--lp-accent-fg)" : "text-(--lp-muted)",
                    )}
                  >
                    {label}
                  </span>
                </li>
              );
            })}
          </ol>
          <div aria-live="polite" className="mt-5.5 grid min-h-6.5">
            <p key={stage} className="col-start-1 row-start-1 m-0 text-[15.5px] animate-[lp-in_.45s_cubic-bezier(.2,.7,.2,1)_both]">
              {CAPTIONS[stage]}
            </p>
          </div>
        </div>

        <div data-rv="260" className="mt-8 flex flex-wrap justify-center gap-3 max-[560px]:flex-col max-[560px]:self-stretch">
          <button type="button" onClick={() => openWaitlist()} className={cn(BTN_PRIMARY, "justify-center")}>
            Join the waitlist
            <ArrowRightIcon className="size-4" aria-hidden="true" />
          </button>
          <Link href="#how" className={cn(BTN_OUTLINE, "justify-center")}>
            See how it works
          </Link>
        </div>
        <div data-rv="0" className="mt-5 flex flex-wrap justify-center gap-x-5.5 gap-y-2 text-[13.5px] text-(--lp-muted)">
          <Tick>Free plan for your first client</Tick>
          <Tick>No card needed</Tick>
          <Tick>Clients never need an account</Tick>
        </div>
      </div>

      <PipelineBoard
        stage={stage}
        jobIndex={state.job}
        banked={state.banked}
        playing={running}
        onToggle={() => setPlaying((p) => !p)}
        onAdvance={() => {
          advance();
          setTick((t) => t + 1);
        }}
        onHover={setHover}
      />
    </section>
  );
}

function LiveCard({
  live,
  job,
  onAdvance,
}: {
  live: Stage;
  job: (typeof JOBS)[number];
  onAdvance: () => void;
}) {
  return (
    <div
      aria-live="polite"
      className="bg-card border-primary flex min-h-42 flex-none flex-col gap-2.5 rounded-[10px] border-[1.5px] p-4 shadow-(--lp-lift) animate-[lp-in_.55s_cubic-bezier(.2,.7,.2,1)_both]"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
        <span className="text-[12.5px] whitespace-nowrap text-(--lp-muted)">{live.kicker}</span>
        <StatusPill tone={live.tone}>{live.badge}</StatusPill>
      </div>
      <div>
        <div className="font-space text-lg leading-[1.2] font-medium tracking-[-0.02em]">{job.title}</div>
        <div className="mt-0.5 text-[13.5px] text-(--lp-muted)">{job.client}</div>
      </div>
      {live.pct && (
        <div className="flex items-center gap-2.5">
          <span className="h-1.5 flex-1 overflow-hidden rounded-[3px] bg-(--lp-track)">
            <span className="bg-primary block h-full rounded-[3px] transition-[width] duration-800" style={{ width: live.pct }} />
          </span>
          <span className="font-space text-[12.5px] text-(--lp-muted)">{live.frac}</span>
        </div>
      )}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t pt-2.5">
        <span className="font-space text-[17px] font-medium tabular-nums">{USD(job.amt)}</span>
        {live.action ? (
          <button
            type="button"
            onClick={onAdvance}
            className="bg-primary text-primary-foreground h-8.5 flex-none cursor-pointer rounded-md px-3 text-[13px] font-medium whitespace-nowrap animate-[lp-pulse_1.8s_infinite] hover:bg-(--lp-primary-hover)"
          >
            {live.action}
          </button>
        ) : (
          <span className="text-[13px] font-medium text-(--lp-success-fg)">{live.note}</span>
        )}
      </div>
      {live.action && <div className="text-[12.5px] text-(--lp-muted)">{live.note}</div>}
    </div>
  );
}

function PipelineBoard({
  stage,
  jobIndex,
  banked,
  playing,
  onToggle,
  onAdvance,
  onHover,
}: {
  stage: number;
  jobIndex: number;
  banked: number;
  playing: boolean;
  onToggle: () => void;
  onAdvance: () => void;
  onHover: (h: boolean) => void;
}) {
  const job = JOBS[jobIndex];
  const reduce = useReducedMotion();
  const paid = 2150 + banked + (stage === 3 ? job.amt : 0);

  return (
    <div
      data-rv="320"
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      className="@container mx-auto mt-[clamp(36px,5vw,56px)] max-w-260 overflow-hidden rounded-2xl border bg-(--lp-sunk) shadow-(--lp-lift)"
    >
      <div className="bg-card flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b px-5 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="text-[14.5px] font-semibold whitespace-nowrap">Your pipeline</span>
          <span className="text-[13.5px] text-(--lp-muted)">Sample data. Watch a job move, or click its button.</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[13.5px] text-(--lp-muted)">
            Paid this month{" "}
            <span className="font-space text-foreground text-base font-medium tabular-nums">{USD(paid)}</span>
            {/* Always takes its space so the header never re-wraps when it appears. */}
            <span
              key={stage === 3 ? jobIndex : "off"}
              aria-hidden={stage !== 3}
              className={cn(
                "font-space ml-2 font-medium text-(--lp-success-fg) tabular-nums",
                stage === 3 ? "animate-[lp-in_.45s_both]" : "invisible",
              )}
            >
              +{USD(job.amt)}
            </span>
          </span>
          <button
            type="button"
            onClick={onToggle}
            aria-label={playing ? "Pause demo" : "Play demo"}
            className="hover:text-foreground -my-1.5 -mr-2 grid size-11 cursor-pointer place-items-center rounded-md text-(--lp-muted) hover:bg-(--lp-hover)"
          >
            {playing ? <PauseIcon className="size-4.5" fill="currentColor" aria-hidden="true" /> : <PlayIcon className="size-4.5" fill="currentColor" aria-hidden="true" />}
          </button>
        </div>
      </div>

      <div className="bg-border grid grid-cols-4 gap-px @max-[760px]:grid-cols-2 @max-[540px]:grid-cols-1">
        {COLS.map((name, i) => {
          const isLive = stage === i;
          const cards = STATIC[i];
          const total = cards.reduce((sum, c) => sum + c.amt, 0) + (isLive ? job.amt : 0);
          return (
            <div
              key={name}
              className={cn(
                // Fixed height: cards below the fold peek out under a fade instead of growing the board.
                "relative flex h-116 flex-col gap-3 overflow-hidden bg-(--lp-sunk) p-4.5 transition-opacity duration-400",
                "@max-[760px]:h-96",
                "@max-[540px]:h-auto @max-[540px]:px-4 @max-[540px]:py-3.5",
                isLive ? "@max-[540px]:min-h-71" : "@max-[540px]:opacity-70",
              )}
            >
              <div className="flex flex-none items-baseline justify-between gap-2">
                <span className="text-[14.5px] font-semibold">{name}</span>
                <span className="font-space text-[13px] text-(--lp-muted) tabular-nums">
                  {cards.length + (isLive ? 1 : 0)} · {K(total)}
                </span>
              </div>

              {isLive && (
                <LiveCard key={`${jobIndex}-${stage}`} live={STAGES[stage](job.inv)} job={job} onAdvance={onAdvance} />
              )}

              {cards.map((card) => (
                <motion.div
                  key={card.kicker + card.title}
                  layout={!reduce}
                  transition={{ duration: 0.5, ease: [0.2, 0.7, 0.2, 1] }}
                  className="bg-card flex min-h-42 flex-none flex-col gap-2.5 rounded-[10px] border p-4 opacity-[.82] @max-[540px]:hidden"
                >
                  <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
                    <span className="text-[12.5px] whitespace-nowrap text-(--lp-muted)">{card.kicker}</span>
                    <StatusPill tone={card.tone}>{card.badge}</StatusPill>
                  </div>
                  <div>
                    <div className="font-space text-lg leading-[1.2] font-medium tracking-[-0.02em]">{card.title}</div>
                    <div className="mt-0.5 text-[13.5px] text-(--lp-muted)">{card.client}</div>
                  </div>
                  <div className="mt-auto flex items-center justify-between gap-2 border-t pt-2.5">
                    <span className="font-space text-[17px] font-medium tabular-nums">{USD(card.amt)}</span>
                    <span className="text-right text-[12.5px] text-(--lp-muted)">{card.note}</span>
                  </div>
                </motion.div>
              ))}
              {/* Fades into the column colour, so the cards melt away instead of greying out. */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-linear-to-b from-transparent to-(--lp-sunk) @max-[540px]:hidden"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
