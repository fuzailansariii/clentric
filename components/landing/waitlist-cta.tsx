"use client";

import { useId, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRightIcon, BellIcon, CheckIcon, LoaderCircleIcon } from "lucide-react";
import { LEGAL } from "@/lib/legal-config";
import { cn } from "@/lib/utils";
import { BTN_PRIMARY, H2, Honeypot, SECTION, Tick } from "./parts";
import { useWaitlistSignup } from "./use-waitlist-signup";

export function WaitlistCta() {
  const id = useId();
  const { email, setEmail, website, setWebsite, error, sent, pending, submit } =
    useWaitlistSignup("beta");

  // Glow follows the pointer; CSS vars avoid a re-render per move.
  const glow = (e: MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  return (
    <section id="waitlist" aria-labelledby="waitlist-h" className={SECTION}>
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
            Opening mid-October 2026
          </span>
          <h2 id="waitlist-h" className={cn(H2, "text-[clamp(38px,5vw,64px)] leading-[.95] tracking-[-0.05em]")}>
            Get in <span className="text-primary">early.</span>
          </h2>
          <p className="max-w-[44ch] text-[17px] leading-[1.55] text-(--lp-muted)">
            Join the waitlist and we&rsquo;ll email you once, when your invite is ready.
          </p>

          {sent ? (
            <div
              role="status"
              className="flex min-h-16 items-center gap-3 rounded-[10px] bg-(--lp-success-bg) px-4 text-base font-medium text-(--lp-success-fg) animate-[lp-in_.45s_both]"
            >
              <CheckIcon className="size-3.75 flex-none" strokeWidth={2.4} aria-hidden="true" />
              <span>
                You&rsquo;re on the list. We&rsquo;ll email{" "}
                <span className="[overflow-wrap:anywhere]">{email}</span> when your invite is ready.
              </span>
            </div>
          ) : (
            <form onSubmit={submit} noValidate className="flex flex-col gap-2">
              <div className="bg-background flex flex-wrap gap-2 rounded-[10px] border border-(--lp-border-strong) p-1.5 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary">
                <label htmlFor={`${id}-email`} className="sr-only">
                  Email address
                </label>
                <input
                  id={`${id}-email`}
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@studio.com"
                  value={email}
                  disabled={pending}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? `${id}-error` : undefined}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 min-w-0 flex-[1_1_200px] rounded-md bg-transparent px-3.5 text-[15px] outline-none placeholder:text-(--lp-muted)"
                />
                <button type="submit" disabled={pending} className={cn(BTN_PRIMARY, "h-11 flex-none justify-center disabled:opacity-70 max-[420px]:flex-1")}>
                  {pending ? (
                    <>
                      <LoaderCircleIcon className="size-4 animate-spin" aria-hidden="true" />
                      Joining…
                    </>
                  ) : (
                    <>
                      Join the waitlist
                      <ArrowRightIcon className="size-4" aria-hidden="true" />
                    </>
                  )}
                </button>
              </div>
              <Honeypot id={`${id}-website`} value={website} onChange={setWebsite} />
              {error && (
                <p id={`${id}-error`} role="alert" className="text-[13.5px] text-(--lp-danger-fg)">
                  {error}
                </p>
              )}
            </form>
          )}

          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-(--lp-muted)">
            <Tick>No card, no demo call</Tick>
            <Tick>One email at launch</Tick>
          </div>
          <p className="text-[13px] text-(--lp-muted)">
            We only use your email to tell you about the launch.{" "}
            <Link href={LEGAL.routes.privacy} className="hover:text-foreground underline underline-offset-2">
              Privacy Policy
            </Link>
          </p>
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
