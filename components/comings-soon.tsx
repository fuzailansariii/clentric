"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  MotionConfig,
  motion,
  useInView,
  useReducedMotion,
  type Variants,
} from "motion/react";
import {
  ArrowDownIcon,
  ArrowRightIcon,
  CheckIcon,
  CircleCheckIcon,
  FileTextIcon,
  FolderKanbanIcon,
  ReceiptIcon,
  TrendingUpIcon,
  UsersIcon,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { StatusBadge } from "@/components/ui/status-badge";
import WaitlistForm from "@/components/waitlist-form";
import { cn } from "@/lib/utils";

// Visual direction: a freelancer's ledger — ruled paper, monospaced figures,
// and the product's own invoice (with its status stamp) as the hero image.
// Every colour comes from the app's theme tokens (app/globals.css), so light
// and dark are the same design rather than one of them being an afterthought.

const LAUNCH_LABEL = "October 2026";

/** Faint horizontal rules, like a ledger page. var(--border) is defined for
 * both themes, so the lines stay visible-but-quiet in each. */
const RULED =
  "bg-[linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-size-[100%_2.5rem]";

const EASE = [0.22, 1, 0.36, 1] as const;

const rise: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

const group: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const MODULES = [
  { label: "Clients", icon: UsersIcon },
  { label: "Projects", icon: FolderKanbanIcon },
  { label: "Proposals", icon: FileTextIcon },
  { label: "Invoices", icon: ReceiptIcon },
];

const FEATURES = [
  {
    num: "01",
    title: "Client management",
    body: "Every client, contact and conversation history in one record.",
    icon: UsersIcon,
  },
  {
    num: "02",
    title: "Projects & proposals",
    body: "Draft, send and track proposals without opening a doc editor.",
    icon: FolderKanbanIcon,
  },
  {
    num: "03",
    title: "Invoices",
    body: "Bill by the item, the hour or the day. Mark it paid the moment it lands.",
    icon: ReceiptIcon,
  },
  {
    num: "04",
    title: "Revenue at a glance",
    body: "Earned, outstanding and overdue, without building a spreadsheet.",
    icon: TrendingUpIcon,
  },
];

// Generic tool categories only — this page never names another company's
// product.
const BEFORE = [
  { name: "Notes app", job: "Client notes" },
  { name: "Inbox", job: "Email threads" },
  { name: "Spreadsheet", job: "Tracking payments" },
  { name: "Docs editor", job: "Proposals" },
  { name: "Calendar", job: "Deadlines" },
];

const AFTER = [
  { name: "Clients", job: "Contacts, notes and history in one record" },
  { name: "Projects", job: "Deadlines and milestones next to the work" },
  { name: "Proposals", job: "Drafted, sent and tracked in place" },
  { name: "Invoices", job: "Payments tracked, Clentric never moves money" },
];

// Sample data for the product previews. Illustrative only; nothing here is
// anyone's real account.
const PREVIEW_INVOICES: {
  name: string;
  amount: string;
  status: string;
  tone: "success" | "info" | "neutral" | "danger";
}[] = [
  {
    name: "Northbeam Studio",
    amount: "$2,400.00",
    status: "Sent",
    tone: "info",
  },
  {
    name: "Halden & Co.",
    amount: "$1,880.00",
    status: "Paid",
    tone: "success",
  },
  {
    name: "Verso Type Foundry",
    amount: "$960.00",
    status: "Draft",
    tone: "neutral",
  },
  {
    name: "Møller Atelier",
    amount: "$1,240.00",
    status: "Overdue",
    tone: "danger",
  },
];
const PREVIEW_BARS = [42, 30, 64, 48, 80, 58, 92, 70];

const HERO_LINES = [
  {
    description: "Brand system - phase 2",
    meta: "1 × $2,400.00",
    amount: "$2,400.00",
  },
  {
    description: "Design sprint",
    meta: "12.5 hrs × $85.00/hr",
    amount: "$1,062.50",
  },
  { description: "Revision call", meta: "1 hr × $85.00/hr", amount: "$85.00" },
];

function formatUsd(n: number) {
  return n.toLocaleString("en-US");
}

/** Counts up to `target` the first time it scrolls into view. With reduced
 * motion it simply shows the final number. */
function CountUp({ target, prefix = "" }: { target: number; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const reduceMotion = useReducedMotion();
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView || reduceMotion) return;
    const duration = 1100;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / duration);
      setValue(Math.round(target * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduceMotion, target]);

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}
      {formatUsd(reduceMotion ? target : value)}
    </span>
  );
}

/** Fades a block up once it scrolls into view. Triggers as soon as any part
 * of it is on screen, so tall blocks never get stuck invisible. */
function Reveal({
  children,
  className,
  delay = 0,
  id,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  id?: string;
}) {
  return (
    <motion.div
      id={id}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      variants={rise}
      transition={{ delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body?: string;
}) {
  return (
    <Reveal className="mx-auto mb-10 max-w-2xl text-center sm:mb-12">
      <p className="text-primary font-mono text-xs tracking-[0.14em] uppercase">
        {eyebrow}
      </p>
      <h2 className="font-space mt-3 text-[clamp(1.75rem,4vw,2.75rem)] leading-[1.08] font-semibold tracking-[-0.03em] text-balance">
        {title}
      </h2>
      {body && (
        <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-base leading-relaxed text-pretty">
          {body}
        </p>
      )}
    </Reveal>
  );
}

function LogoMark() {
  return (
    <a
      href="#top"
      className="flex items-center gap-2.5"
      aria-label="Clentric home"
    >
      <span className="bg-primary text-primary-foreground font-space flex size-7 items-center justify-center rounded-md text-sm font-bold">
        C
      </span>
      <span className="font-space text-lg font-semibold tracking-tight">
        Clentric
      </span>
    </a>
  );
}

/** The hero image: a sample invoice that gets stamped paid. */
function HeroInvoice() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: EASE, delay: 0.25 }}
      className="relative mx-auto w-full max-w-md lg:max-w-none"
    >
      <div
        aria-hidden="true"
        className="bg-primary/10 absolute -inset-4 -z-10 rounded-[2rem] blur-3xl sm:-inset-8"
      />

      {/* "Marked paid" notification */}
      <motion.div
        initial={{ opacity: 0, y: -8, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 1.7, duration: 0.45, ease: EASE }}
        className="border-border bg-card absolute -top-4 right-4 z-10 flex items-center gap-2 rounded-full border py-1.5 pr-3.5 pl-2 text-xs shadow-lg"
      >
        <CircleCheckIcon
          className="text-success-600 size-4"
          aria-hidden="true"
        />
        <span className="font-medium">Marked as paid</span>
        <span className="text-muted-foreground font-mono">just now</span>
      </motion.div>

      <div className="border-border bg-card relative overflow-hidden rounded-2xl border shadow-[0_24px_60px_-30px_rgb(0_0_0/0.4)]">
        <div className="bg-primary h-1" />
        <div className="p-5 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-space text-muted-foreground text-[11px] font-bold tracking-[0.2em] uppercase">
                Invoice
              </p>
              <p className="mt-1 font-mono text-xl font-semibold tracking-tight">
                INV-042
              </p>
            </div>
            <dl className="text-right text-xs leading-6">
              <div className="flex justify-end gap-3">
                <dt className="text-muted-foreground">Issued</dt>
                <dd className="font-mono">Oct 1, 2026</dd>
              </div>
              <div className="flex justify-end gap-3">
                <dt className="text-muted-foreground">Due</dt>
                <dd className="font-mono font-semibold">Oct 15, 2026</dd>
              </div>
            </dl>
          </div>

          <div className="border-border mt-5 border-t pt-4">
            <p className="text-muted-foreground font-mono text-[10px] tracking-[0.14em] uppercase">
              Bill to
            </p>
            <p className="mt-1 text-sm font-semibold">Northbeam Studio</p>
          </div>

          <motion.ul
            variants={group}
            initial="hidden"
            animate="visible"
            transition={{ delayChildren: 0.6 }}
            className="border-border mt-4 border-t"
          >
            {HERO_LINES.map((line) => (
              <motion.li
                key={line.description}
                variants={rise}
                className="border-border grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 border-b py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm">{line.description}</p>
                  <p className="text-muted-foreground mt-0.5 font-mono text-xs">
                    {line.meta}
                  </p>
                </div>
                <p className="font-mono text-sm tabular-nums">{line.amount}</p>
              </motion.li>
            ))}
          </motion.ul>

          <div className="mt-5 flex items-end justify-between gap-4">
            {/* Stamp lands after the line items */}
            <motion.div
              aria-label="Status: paid"
              role="img"
              initial={{ opacity: 0, scale: 1.8, rotate: -20 }}
              animate={{ opacity: 1, scale: 1, rotate: -8 }}
              transition={{
                delay: 1.2,
                type: "spring",
                stiffness: 420,
                damping: 17,
              }}
              className="text-success-600 bg-success-600/5 shrink-0 rounded-md border-[3px] border-double border-current px-3 py-1.5 text-center select-none"
            >
              <p className="font-space text-xl leading-none font-bold tracking-[0.15em] uppercase">
                Paid
              </p>
              <p className="mt-1 border-t border-current/40 pt-1 font-mono text-[9px] tracking-wide uppercase">
                Oct 12, 2026
              </p>
            </motion.div>

            <div className="text-right">
              <p className="text-muted-foreground font-mono text-[10px] tracking-[0.14em] uppercase">
                Total paid
              </p>
              <p className="mt-1 font-mono text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
                $3,547.50
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function ComingSoon({
  waitlistCount = null,
}: {
  /** Real, currently-subscribed signups. null when the count couldn't be
   * read — the page then says nothing rather than claiming zero. */
  waitlistCount?: number | null;
}) {
  // Starts from the server's number and goes up by one when someone joins on
  // this page, so the line reflects their own signup without a reload.
  const [count, setCount] = useState(waitlistCount);
  const onJoined = () => setCount((c) => (c === null ? c : c + 1));

  const waitingText =
    count === null
      ? null
      : count === 0
        ? "Be one of the first on the list"
        : count === 1
          ? "1 freelancer is already waiting"
          : `${formatUsd(count)} freelancers are already waiting`;

  return (
    <MotionConfig reducedMotion="user">
      <div
        id="top"
        className="bg-background text-foreground selection:bg-primary/20 min-h-screen w-full overflow-x-clip font-sans"
      >
        {/* ── Header ─────────────────────────────────────────────── */}
        <header className="border-border bg-background/80 sticky top-0 z-40 border-b backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
            <LogoMark />
            <nav
              aria-label="Sections"
              className="hidden items-center gap-7 md:flex"
            >
              {[
                { href: "#product", label: "Product" },
                { href: "#features", label: "Features" },
                { href: "#why", label: "Why Clentric" },
              ].map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </nav>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <a
                href="#waitlist"
                className="bg-primary text-primary-foreground font-space inline-flex h-9 items-center rounded-lg px-3.5 text-sm font-semibold transition-[filter] hover:brightness-110"
              >
                Get early access
              </a>
            </div>
          </div>
        </header>

        <main>
          {/* ── Hero ─────────────────────────────────────────────── */}
          <section className="relative">
            <div
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute inset-0 mask-[linear-gradient(to_bottom,black,transparent_85%)]",
                RULED,
              )}
            />
            {/* A ledger's red margin rule, only where there's room for it */}
            <div
              aria-hidden="true"
              className="bg-danger-600/15 pointer-events-none absolute inset-y-0 left-[max(1.25rem,calc((100%-72rem)/2-1.5rem))] hidden w-px mask-[linear-gradient(to_bottom,black,transparent_85%)] xl:block"
            />

            <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-5 pt-14 pb-16 sm:pt-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:gap-16 lg:pt-24 lg:pb-20">
              <motion.div variants={group} initial="hidden" animate="visible">
                <motion.p
                  variants={rise}
                  className="border-border bg-card text-muted-foreground inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium"
                >
                  <span className="relative flex size-2">
                    <span className="bg-primary absolute inset-0 animate-ping rounded-full opacity-60 motion-reduce:hidden" />
                    <span className="bg-primary relative size-2 rounded-full" />
                  </span>
                  Coming soon - {LAUNCH_LABEL}
                </motion.p>

                <motion.h1
                  variants={rise}
                  className="font-space mt-6 text-[clamp(2.5rem,5vw,3.75rem)] leading-[1.02] font-semibold tracking-[-0.04em] text-balance"
                >
                  The workspace freelancers{" "}
                  <span className="text-primary">actually keep open.</span>
                </motion.h1>

                <motion.p
                  variants={rise}
                  className="text-muted-foreground mt-5 max-w-xl text-lg leading-relaxed text-pretty"
                >
                  Clients, projects, proposals and invoices in one place -
                  instead of five tabs you keep forgetting to check.
                </motion.p>

                <motion.div
                  id="waitlist"
                  variants={rise}
                  className="mt-8 max-w-lg scroll-mt-24"
                >
                  <WaitlistForm align="start" onJoined={onJoined} />
                  <p className="text-muted-foreground mt-4 text-sm">
                    {waitingText && (
                      <>
                        <span className="text-foreground font-medium">
                          {waitingText}.
                        </span>{" "}
                      </>
                    )}
                    No card, no demo call.
                  </p>
                </motion.div>

                <motion.ul
                  variants={rise}
                  aria-label="What's inside"
                  className="border-border mt-10 flex flex-wrap gap-x-6 gap-y-3 border-t pt-6"
                >
                  {MODULES.map(({ label, icon: Icon }) => (
                    <li
                      key={label}
                      className="text-muted-foreground flex items-center gap-2 text-sm"
                    >
                      <Icon
                        className="text-primary size-4"
                        aria-hidden="true"
                      />
                      {label}
                    </li>
                  ))}
                </motion.ul>
              </motion.div>

              <HeroInvoice />
            </div>
          </section>

          {/* ── Product preview ──────────────────────────────────── */}
          <section
            id="product"
            className="mx-auto max-w-6xl scroll-mt-20 px-5 pt-10 pb-20 sm:pt-14 sm:pb-28"
          >
            <SectionHeading
              eyebrow="The dashboard"
              title="One screen. Every number that matters."
              body="What you've earned, what's still out, and who's late - the moment you open it."
            />

            <Reveal className="border-border bg-card overflow-hidden rounded-2xl border shadow-[0_24px_60px_-34px_rgb(0_0_0/0.35)]">
              <div className="border-border bg-muted flex items-center gap-3 border-b px-4 py-2.5">
                <div className="flex shrink-0 gap-1.5" aria-hidden="true">
                  <span className="bg-foreground/15 size-2.5 rounded-full" />
                  <span className="bg-foreground/15 size-2.5 rounded-full" />
                  <span className="bg-foreground/15 size-2.5 rounded-full" />
                </div>
                <div className="border-border bg-card text-muted-foreground min-w-0 flex-1 truncate rounded-md border px-3 py-1 font-mono text-xs">
                  clentric.app/dashboard
                </div>
                <span className="text-muted-foreground hidden font-mono text-[10px] tracking-[0.12em] uppercase sm:inline">
                  Sample data
                </span>
              </div>

              {/* 1px gaps over a border-coloured background draw the dividers,
                  so they stay single and correct however the cells wrap. */}
              <div className="bg-border border-border grid gap-px border-b sm:grid-cols-3">
                <div className="bg-card px-5 py-5">
                  <p className="text-muted-foreground text-xs tracking-wide uppercase">
                    Outstanding
                  </p>
                  <p className="mt-2 font-mono text-3xl font-medium tracking-tight">
                    <CountUp target={4280} prefix="$" />
                  </p>
                  <p className="text-muted-foreground mt-1.5 text-xs">
                    3 invoices unpaid
                  </p>
                </div>
                <div className="bg-card px-5 py-5">
                  <p className="text-muted-foreground text-xs tracking-wide uppercase">
                    Paid this month
                  </p>
                  <p className="text-primary mt-2 font-mono text-3xl font-medium tracking-tight">
                    <CountUp target={7150} prefix="$" />
                  </p>
                  <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={{
                      hidden: {},
                      visible: { transition: { staggerChildren: 0.05 } },
                    }}
                    className="mt-3 flex h-8 items-end gap-1"
                    aria-hidden="true"
                  >
                    {PREVIEW_BARS.map((h, i) => (
                      <motion.span
                        key={i}
                        variants={{
                          hidden: { scaleY: 0 },
                          visible: {
                            scaleY: 1,
                            transition: { duration: 0.6, ease: EASE },
                          },
                        }}
                        style={{ height: `${h}%` }}
                        className="bg-primary/60 flex-1 origin-bottom rounded-t-sm"
                      />
                    ))}
                  </motion.div>
                </div>
                <div className="bg-card px-5 py-5">
                  <p className="text-muted-foreground text-xs tracking-wide uppercase">
                    Active clients
                  </p>
                  <p className="mt-2 font-mono text-3xl font-medium tracking-tight">
                    <CountUp target={6} />
                  </p>
                  <p className="text-muted-foreground mt-1.5 text-xs">
                    2 added this quarter
                  </p>
                </div>
              </div>

              <div className="text-muted-foreground border-border grid grid-cols-[minmax(0,1fr)_5.5rem] gap-x-4 border-b px-5 py-2.5 text-[11px] tracking-widest uppercase sm:grid-cols-[minmax(0,1fr)_7rem_5.5rem]">
                <span>Client</span>
                <span className="hidden text-right sm:block">Amount</span>
                <span className="text-right">Status</span>
              </div>
              <ul>
                {PREVIEW_INVOICES.map((row) => (
                  <li
                    key={row.name}
                    className="border-border hover:bg-muted grid grid-cols-[minmax(0,1fr)_5.5rem] items-center gap-x-4 border-b px-5 py-3.5 transition-colors last:border-b-0 sm:grid-cols-[minmax(0,1fr)_7rem_5.5rem]"
                  >
                    <div className="min-w-0">
                      <p className="font-space truncate text-[15px] font-medium">
                        {row.name}
                      </p>
                      {/* On phones the amount moves under the name instead of
                          squeezing the name into an ellipsis. */}
                      <p className="text-muted-foreground mt-0.5 font-mono text-xs tabular-nums sm:hidden">
                        {row.amount}
                      </p>
                    </div>
                    <p className="hidden text-right font-mono text-sm tabular-nums sm:block">
                      {row.amount}
                    </p>
                    <div className="flex justify-end">
                      <StatusBadge status={row.tone} variant="soft" size="sm">
                        {row.status}
                      </StatusBadge>
                    </div>
                  </li>
                ))}
              </ul>
            </Reveal>
          </section>

          {/* ── Features ─────────────────────────────────────────── */}
          <section
            id="features"
            className="border-border bg-muted scroll-mt-20 border-y"
          >
            <div className="mx-auto max-w-6xl px-5 py-20 sm:py-28">
              <SectionHeading
                eyebrow="What's inside"
                title="Four tools, one record."
              />
              <Reveal className="bg-border border-border grid gap-px overflow-hidden rounded-2xl border sm:grid-cols-2">
                {FEATURES.map((f) => (
                  <div key={f.title} className="bg-card group p-6 sm:p-8">
                    <div className="flex items-center justify-between">
                      <span className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg transition-transform duration-300 group-hover:-translate-y-0.5">
                        <f.icon className="size-5" aria-hidden="true" />
                      </span>
                      <span className="text-muted-foreground font-mono text-xs">
                        {f.num}
                      </span>
                    </div>
                    <h3 className="font-space mt-5 text-xl font-semibold tracking-tight">
                      {f.title}
                    </h3>
                    <p className="text-muted-foreground mt-2 leading-relaxed text-pretty">
                      {f.body}
                    </p>
                  </div>
                ))}
              </Reveal>
            </div>
          </section>

          {/* ── Why ──────────────────────────────────────────────── */}
          <section
            id="why"
            className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20 sm:py-28"
          >
            <SectionHeading
              eyebrow="Why Clentric"
              title="Close the other five tabs."
              body="The scattered setup most freelancers run on, and the one record that replaces it."
            />

            <div className="grid items-stretch gap-4 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
              <Reveal className="border-border rounded-2xl border border-dashed p-6 sm:p-7">
                <p className="text-muted-foreground font-mono text-xs tracking-[0.14em] uppercase">
                  Before
                </p>
                <ul className="mt-4">
                  {BEFORE.map((tool) => (
                    <li
                      key={tool.name}
                      className="border-border flex items-baseline justify-between gap-4 border-b py-3 last:border-b-0"
                    >
                      <span className="text-muted-foreground decoration-danger-600/60 line-through decoration-2">
                        {tool.name}
                      </span>
                      <span className="text-muted-foreground text-right text-sm">
                        {tool.job}
                      </span>
                    </li>
                  ))}
                </ul>
              </Reveal>

              <div
                className="flex items-center justify-center"
                aria-hidden="true"
              >
                <span className="border-border bg-card text-primary flex size-10 items-center justify-center rounded-full border">
                  <ArrowRightIcon className="hidden size-4 md:block" />
                  <ArrowDownIcon className="size-4 md:hidden" />
                </span>
              </div>

              <Reveal
                delay={0.1}
                className="border-primary/30 bg-primary/5 rounded-2xl border p-6 sm:p-7"
              >
                <p className="text-primary font-mono text-xs tracking-[0.14em] uppercase">
                  With Clentric
                </p>
                <ul className="mt-4">
                  {AFTER.map((item) => (
                    <li
                      key={item.name}
                      className="border-primary/15 flex items-start gap-3 border-b py-3 last:border-b-0"
                    >
                      <span className="bg-primary text-primary-foreground mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full">
                        <CheckIcon className="size-3" aria-hidden="true" />
                      </span>
                      <span className="min-w-0">
                        <span className="font-medium">{item.name}</span>
                        <span className="text-muted-foreground block text-sm">
                          {item.job}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </Reveal>
            </div>

            <Reveal className="bg-border border-border mt-4 grid gap-px overflow-hidden rounded-2xl border sm:grid-cols-3">
              {[
                { big: "5 → 1", label: "Tools collapsed into one workspace." },
                { big: "<60s", label: "From a blank invoice to a sent one." },
                { big: "1 email", label: "At launch. Nothing else, ever." },
              ].map((s) => (
                <div key={s.big} className="bg-card p-6 sm:p-7">
                  <p className="font-space text-primary text-4xl font-semibold tracking-tight">
                    {s.big}
                  </p>
                  <p className="text-muted-foreground mt-2 text-sm">
                    {s.label}
                  </p>
                </div>
              ))}
            </Reveal>
          </section>

          {/* ── Final call to action ─────────────────────────────── */}
          <section className="mx-auto max-w-6xl px-5 pb-20 sm:pb-28">
            <Reveal className="border-border bg-card relative overflow-hidden rounded-3xl border px-6 py-14 text-center sm:px-12 sm:py-20">
              <div
                aria-hidden="true"
                className={cn(
                  "pointer-events-none absolute inset-0 mask-[radial-gradient(ellipse_at_center,black_20%,transparent_75%)]",
                  RULED,
                )}
              />
              <div className="relative">
                <h2 className="font-space mx-auto max-w-2xl text-[clamp(2rem,5vw,3.25rem)] leading-[1.05] font-semibold tracking-[-0.035em] text-balance">
                  Get the workspace before everyone else.
                </h2>
                <p className="text-muted-foreground mx-auto mt-4 max-w-lg text-pretty">
                  Join the waitlist and we&rsquo;ll email you once - the day it
                  opens.
                </p>
                <WaitlistForm
                  align="center"
                  className="mx-auto mt-8 max-w-lg text-left"
                  onJoined={onJoined}
                />
              </div>
            </Reveal>
          </section>
        </main>

        <footer className="border-border border-t">
          <div className="text-muted-foreground mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 text-sm sm:flex-row">
            <div className="flex items-center gap-3">
              <span className="bg-primary text-primary-foreground font-space flex size-6 items-center justify-center rounded text-xs font-bold">
                C
              </span>
              <span>© 2026 Clentric · Built with care.</span>
            </div>
            <Link
              href="/unsubscribe"
              className="hover:text-foreground underline-offset-4 hover:underline"
            >
              Unsubscribe
            </Link>
          </div>
        </footer>
      </div>
    </MotionConfig>
  );
}
