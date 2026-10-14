"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useReducedMotion } from "motion/react";
import { BellIcon, CheckIcon, LockIcon, ReceiptIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { SECTION, SectionHead, StatusPill } from "./parts";

const CHORES = [
  ["Emailing proposal PDFs and waiting", "A link they read on their phone and accept in one tap."],
  ["Copying the scope into a project tool", "An accepted proposal becomes the project, milestones and all."],
  ["Rebuilding every invoice by hand", "Bill a finished milestone in a minute, by the item, hour or day."],
  ["Writing awkward “just checking in” emails", "Send a friendly reminder in one click, invoice attached."],
  ["Keeping a spreadsheet of who owes what", "One dashboard that always knows what is paid, due and late."],
] as const;

const STATS = [
  { big: "5 → 1", label: "Tools collapsed into one workspace." },
  { big: "<60s", label: "From a blank invoice to a sent one." },
  { big: "1 email", label: "At launch. Nothing else, ever." },
];

const CARD = "bg-card rounded-xl border p-5 shadow-(--lp-lift)";
const MONEY = "font-space font-medium whitespace-nowrap tabular-nums";
const IN = (delay: string) => ({ animation: `lp-in .45s ${delay} both` });

export function HowItWorks() {
  const reduce = useReducedMotion();
  const [chore, setChore] = useState(0);
  const [auto, setAuto] = useState(true);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const cycling = auto && !reduce;
  useEffect(() => {
    if (!cycling || !visible) return;
    const t = setInterval(() => {
      if (!document.hidden) setChore((c) => (c + 1) % CHORES.length);
    }, 5000);
    return () => clearInterval(t);
  }, [cycling, visible]);

  const pick = (i: number) => {
    setChore(i);
    setAuto(false);
  };
  const struck = visible || !!reduce;

  return (
    <section id="how" ref={ref} aria-labelledby="how-h" className={cn(SECTION, "@container")}>
      <SectionHead
        eyebrow="How it works"
        title="Five chores you can stop doing."
        titleId="how-h"
        aside={
          <p className="m-0 max-w-[42ch] text-[17px] text-pretty text-(--lp-muted)">
            Each step hands off to the next, so nothing gets copied twice or
            forgotten. Pick one to see it.
          </p>
        }
      />

      <div className="mt-12 grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] items-start gap-x-[clamp(28px,4vw,64px)] gap-y-8 @max-[720px]:mt-8 @max-[720px]:gap-5">
        {/* Phones: five numbered tabs and the chosen chore. */}
        <div className="hidden flex-col gap-4 @max-[720px]:flex">
          <div role="tablist" aria-label="Chores" className="grid grid-cols-5 gap-1.5">
            {CHORES.map(([, after], i) => {
              const on = chore === i;
              return (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  aria-label={after}
                  onClick={() => pick(i)}
                  className={cn(
                    "font-space relative h-12 cursor-pointer overflow-hidden rounded-[10px] border text-[15px] font-medium transition-colors duration-300",
                    on ? "bg-primary border-primary text-primary-foreground" : "bg-card border-(--lp-border-strong) text-(--lp-muted)",
                  )}
                >
                  0{i + 1}
                  {on && cycling && (
                    <span
                      key={`m-${chore}`}
                      aria-hidden="true"
                      className="bg-primary-foreground absolute inset-x-0 bottom-0 h-0.75 origin-left opacity-60 animate-[lp-grow_5s_linear_both]"
                    />
                  )}
                </button>
              );
            })}
          </div>
          <div aria-live="polite" className="flex min-h-22 flex-col gap-1.5">
            <span className="relative self-start text-[14.5px] text-(--lp-muted)">
              {CHORES[chore][0]}
              <span className="absolute inset-x-0 top-[55%] h-[1.5px] bg-(--lp-muted)" />
            </span>
            <span className="font-space text-[21px] leading-[1.25] font-medium tracking-[-0.02em] text-pretty">
              {CHORES[chore][1]}
            </span>
          </div>
        </div>

        <div data-rv="0" role="tablist" aria-orientation="vertical" aria-label="Chores" className="border-t border-(--lp-border-strong) @max-[720px]:hidden">
          {CHORES.map(([before, after], i) => {
            const on = chore === i;
            return (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => pick(i)}
                className="relative grid w-full cursor-pointer grid-cols-[40px_minmax(0,1fr)] gap-x-4 gap-y-1.5 border-b py-5.5 pr-3 text-left transition-colors hover:bg-(--lp-hover)"
              >
                <span className={cn("font-space pt-0.5 text-sm transition-colors duration-300", on ? "text-primary" : "text-(--lp-muted)")}>
                  0{i + 1}
                </span>
                <span className="relative justify-self-start text-[15px] text-(--lp-muted)">
                  {before}
                  <span
                    className="absolute inset-x-0 top-[55%] h-[1.5px] origin-left bg-(--lp-muted)"
                    style={{
                      transform: struck ? "scaleX(1)" : "scaleX(0)",
                      transition: "transform .7s cubic-bezier(.6,0,.2,1) .45s",
                    }}
                  />
                </span>
                <span />
                <span
                  className="font-space text-[clamp(17px,1.5vw,20px)] leading-[1.25] font-medium tracking-[-0.02em] text-pretty transition-opacity duration-300"
                  style={{ opacity: on ? 1 : 0.5 }}
                >
                  {after}
                </span>
                {on && (
                  <span
                    key={`d-${chore}-${cycling}`}
                    aria-hidden="true"
                    className={cn(
                      "bg-primary absolute inset-x-0 -bottom-px h-0.5 origin-left",
                      cycling && "animate-[lp-grow_5s_linear_both]",
                    )}
                  />
                )}
              </button>
            );
          })}
        </div>

        <div data-rv="120" className="sticky top-24 @max-[720px]:static">
          <div
            role="tabpanel"
            aria-live="polite"
            className="relative min-h-110 overflow-hidden rounded-2xl border bg-(--lp-sunk) p-[clamp(18px,3vw,32px)] @max-[720px]:min-h-0"
          >
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[radial-gradient(var(--lp-border-strong)_1.1px,transparent_1.3px)] bg-size-[18px_18px] mask-[radial-gradient(ellipse_at_50%_40%,#000_30%,transparent_80%)]"
            />
            <div className="relative" key={chore}>
              {PANELS[chore]}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-16 grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] border-t border-(--lp-border-strong)">
        {STATS.map((s, i) => (
          <div key={s.big} data-rv={String(i * 90)} className="flex flex-col gap-1.5 border-b pt-7 pr-6">
            <span className="font-space text-[clamp(34px,3.6vw,48px)] leading-none font-medium tracking-[-0.045em] tabular-nums">
              {s.big}
            </span>
            <span className="pb-6 text-[15px] text-(--lp-muted)">{s.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Row({ children, delay }: { children: ReactNode; delay: string }) {
  return (
    <div className="flex items-center gap-3 border-t py-2.5 text-[14.5px]" style={IN(delay)}>
      {children}
    </div>
  );
}

function Done({ delay }: { delay: string }) {
  return (
    <span className="grid size-5.5 flex-none place-items-center rounded-full bg-(--lp-success-bg) text-(--lp-success-fg)" style={{ animation: `lp-in .4s ${delay} both` }}>
      <CheckIcon className="size-3" strokeWidth={3} aria-hidden="true" />
    </span>
  );
}

const PANELS: ReactNode[] = [
  <div key="0" className="flex flex-col gap-3">
    <div className="bg-card flex h-7.5 max-w-full items-center gap-2 self-start rounded-full border px-3 text-[13px] text-(--lp-muted)" style={{ animation: "lp-in .4s both" }}>
      <LockIcon className="size-3.5" aria-hidden="true" />
      <span className="min-w-0 truncate">clentric.app/p/northbeam-phase-2</span>
    </div>
    <div className={CARD} style={{ animation: "lp-in .5s .1s both" }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[13px] text-(--lp-muted)">Proposal from Maya Lin</div>
          <div className="font-space mt-0.5 text-[22px] font-medium tracking-[-0.02em]">Brand system, phase 2</div>
        </div>
        <StatusPill tone="viewed">Viewed</StatusPill>
      </div>
      <div className="mt-4 flex flex-col gap-2">
        <span className="h-2 w-[92%] rounded bg-(--lp-track)" />
        <span className="h-2 w-[76%] rounded bg-(--lp-track)" />
        <span className="h-2 w-[60%] rounded bg-(--lp-track)" />
      </div>
      <div className="mt-4.5 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <div>
          <div className="text-[13px] text-(--lp-muted)">2 milestones · 30% deposit</div>
          <div className={cn(MONEY, "text-2xl")}>$2,400.00</div>
        </div>
        <span className="bg-primary text-primary-foreground inline-flex h-10 items-center rounded-md px-4 text-[14.5px] font-medium whitespace-nowrap" style={{ animation: "lp-pulse 1.8s 1s infinite" }}>
          Accept proposal
        </span>
      </div>
    </div>
    <div className="bg-card flex items-center gap-2.5 self-end rounded-xl border px-3.5 py-2.5 text-[13.5px] shadow-(--lp-lift)" style={{ animation: "lp-in .45s .9s both" }}>
      <span className="size-2 rounded-full bg-(--lp-viewed-fg)" />
      Northbeam opened it on their phone · 2m ago
    </div>
  </div>,

  <div key="1" className={CARD} style={{ animation: "lp-in .5s both" }}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="text-[13px] text-(--lp-muted)">New project · Northbeam Studio</div>
        <div className="font-space mt-0.5 text-[22px] font-medium tracking-[-0.02em]">Brand system, phase 2</div>
      </div>
      <span className="inline-flex h-5.5 items-center rounded-full bg-(--lp-accent-bg) px-2 text-xs font-medium whitespace-nowrap text-(--lp-accent-fg)">
        From proposal
      </span>
    </div>
    <div className="mt-3.5">
      <Row delay=".2s"><Done delay=".35s" /><span className="flex-1">Deposit paid</span><span className="text-[13px] text-(--lp-muted)">Today</span></Row>
      {[["Type and color", "Oct 9", ".35s"], ["Components", "Oct 20", ".5s"], ["Handoff", "Oct 31", ".65s"]].map(([t, d, delay]) => (
        <Row key={t} delay={delay}>
          <span className="size-5.5 flex-none rounded-full border-[1.5px] border-(--lp-border-strong)" />
          <span className="flex-1">{t}</span>
          <span className="text-[13px] text-(--lp-muted)">{d}</span>
        </Row>
      ))}
    </div>
    <div className="mt-1.5 flex items-center gap-3 rounded-lg bg-(--lp-sunk) px-3.5 py-3 text-sm" style={IN("1s")}>
      <ReceiptIcon className="size-4 text-(--lp-accent-fg)" aria-hidden="true" />
      <span className="min-w-0 flex-1">Deposit invoice INV-041 sent to the client</span>
      <span className={MONEY}>$720.00</span>
    </div>
  </div>,

  <div key="2" className="flex flex-col gap-3">
    <div className="bg-card flex items-center gap-2.5 self-start rounded-xl border px-3.5 py-2.5 text-sm shadow-(--lp-lift)" style={{ animation: "lp-in .4s both" }}>
      <Done delay=".2s" />
      <span>Milestone done: <b className="font-medium">Components</b></span>
    </div>
    <div aria-hidden="true" className="ml-6 h-5.5 w-0.5 origin-top bg-(--lp-border-strong)" style={{ animation: "lp-rise .4s .45s both" }} />
    <div className={CARD} style={{ animation: "lp-in .5s .6s both" }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[13px] text-(--lp-muted)">New invoice · Northbeam Studio</div>
          <div className={cn(MONEY, "mt-0.5 text-[22px]")}>INV-042</div>
        </div>
        <StatusPill tone="neutral">Draft</StatusPill>
      </div>
      <div className="mt-3">
        <Row delay=".8s">
          <div className="min-w-0 flex-1"><div className="font-medium">Components milestone</div><div className="text-[13px] text-(--lp-muted)">1 × $1,200.00</div></div>
          <span className={MONEY}>$1,200.00</span>
        </Row>
        <Row delay=".95s">
          <div className="min-w-0 flex-1"><div className="font-medium">Design sprint</div><div className="text-[13px] text-(--lp-muted)">12.5 hrs × $85.00/hr</div></div>
          <span className={MONEY}>$1,062.50</span>
        </Row>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-(--lp-border-strong) pt-3.5" style={IN("1.1s")}>
        <div><div className="text-[13px] text-(--lp-muted)">Total due Oct 30</div><div className={cn(MONEY, "text-2xl")}>$2,262.50</div></div>
        <span className="bg-primary text-primary-foreground inline-flex h-10 items-center rounded-md px-4 text-[14.5px] font-medium whitespace-nowrap">Send invoice</span>
      </div>
    </div>
  </div>,

  <div key="3" className={CARD} style={{ animation: "lp-in .5s both" }}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="text-[13px] text-(--lp-muted)">INV-039 · Halden &amp; Co</div>
        <div className={cn(MONEY, "mt-0.5 text-2xl")}>$960.00</div>
      </div>
      <StatusPill tone="danger">Overdue</StatusPill>
    </div>
    <div className="mt-3">
      {[
        ["bg-(--lp-info-fg)", "You sent it", "Sep 24", ".15s"],
        ["bg-(--lp-warning-fg)", "Due date passed", "Oct 1", ".3s"],
        ["bg-primary", "Reminder sent in one click", "Oct 4", ".45s"],
      ].map(([dot, label, date, delay]) => (
        <Row key={label} delay={delay}>
          <span className={cn("mx-1.5 size-2.5 flex-none rounded-full", dot)} />
          <span className="flex-1">{label}</span>
          <span className="text-[13px] text-(--lp-muted)">{date}</span>
        </Row>
      ))}
      <Row delay=".6s">
        <span className="border-primary mx-1.5 size-2.5 flex-none rounded-full border-2" />
        <span className="flex-1 text-(--lp-muted)">Mark it paid when the money lands</span>
      </Row>
    </div>
    <div className="mt-2 rounded-lg bg-(--lp-sunk) px-4 py-3.5 text-sm leading-normal text-(--lp-muted)" style={IN(".9s")}>
      <div className="mb-1.5 flex items-center gap-1.5 text-xs tracking-[.06em] uppercase">
        <BellIcon className="size-3" aria-hidden="true" />
        Reminder preview
      </div>
      <span className="text-foreground">
        Hi Sam, a quick nudge on INV-039 for $960.00, due Oct 1. The invoice is attached.
      </span>
    </div>
  </div>,

  <div key="4" className={CARD} style={{ animation: "lp-in .5s both" }}>
    <div className="flex flex-wrap items-baseline justify-between gap-3">
      <span className="text-[14.5px] font-semibold">October</span>
      <span className="text-[13px] text-(--lp-muted)">Updated just now</span>
    </div>
    <div className="bg-border mt-3.5 grid grid-cols-[repeat(auto-fit,minmax(110px,1fr))] gap-px overflow-hidden rounded-lg border">
      {[["Paid", "$6,820", ""], ["Outstanding", "$4,410", ""], ["Overdue", "$960", "text-(--lp-danger-fg)"]].map(([label, value, tone], i) => (
        <div key={label} className="bg-card px-3.5 py-3" style={{ animation: `lp-in .4s ${0.15 + i * 0.15}s both` }}>
          <div className="text-[13px] text-(--lp-muted)">{label}</div>
          <div className={cn(MONEY, "mt-0.5 text-[22px]", tone)}>{value}</div>
        </div>
      ))}
    </div>
    <div aria-hidden="true" className="mt-5 flex h-30 items-end gap-2.5 border-b pb-2">
      {[[58, 46], [74, 62], [50, 38], [82, 70], [67, 55], [100, 88]].map(([inv, paid], i) => (
        <div key={i} className="flex h-full flex-1 items-end gap-0.75">
          <span className="flex-1 origin-bottom rounded-t-[3px] bg-(--lp-track)" style={{ height: `${inv}%`, animation: `lp-rise .6s ${0.2 + i * 0.08}s both` }} />
          <span className="bg-primary flex-1 origin-bottom rounded-t-[3px]" style={{ height: `${paid}%`, animation: `lp-rise .6s ${0.3 + i * 0.08}s both` }} />
        </div>
      ))}
    </div>
    <div className="mt-1.5 flex justify-between text-[13px] text-(--lp-muted)">
      {["May", "Jun", "Jul", "Aug", "Sep", "Oct"].map((m) => <span key={m}>{m}</span>)}
    </div>
    <div className="mt-2.5 flex gap-4 text-[13px] text-(--lp-muted)">
      <span className="inline-flex items-center gap-1.5"><span className="bg-primary size-2 rounded-[2px]" />Paid</span>
      <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-[2px] bg-(--lp-track)" />Invoiced</span>
    </div>
  </div>,
];
