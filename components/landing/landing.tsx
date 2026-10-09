"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LegalFooter } from "@/components/legal/legal-footer";
import { cn } from "@/lib/utils";
import { DashboardTour } from "./dashboard-tour";
import { Faq } from "./faq";
import { Hero } from "./hero";
import { HowItWorks } from "./how-it-works";
import { NAV_LINKS, Navbar } from "./navbar";
import { FRAME, FrameLine, FrameRails } from "./parts";
import { Pricing } from "./pricing";
import { WaitlistContext, type WaitlistKind } from "./waitlist-context";
import { WaitlistCta } from "./waitlist-cta";
import { WaitlistDialog } from "./waitlist-dialog";

export function Landing({ today, signedIn }: { today: string; signedIn: boolean }) {
  const [dialog, setDialog] = useState<WaitlistKind | null>(null);
  const [active, setActive] = useState("");
  const root = useRef<HTMLDivElement>(null);

  // [data-rv="delay"] fades up once it scrolls into view.
  useEffect(() => {
    const els = root.current?.querySelectorAll<HTMLElement>("[data-rv]");
    if (!els?.length) return;
    const show = (el: HTMLElement) => {
      el.style.transitionDelay = `${Number(el.dataset.rv) || 0}ms`;
      el.classList.add("rv-in");
    };
    if (typeof IntersectionObserver === "undefined") {
      els.forEach(show);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          show(e.target as HTMLElement);
          io.unobserve(e.target);
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(e.target.id);
          else setActive((a) => (a === e.target.id ? "" : a));
        }
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    for (const l of NAV_LINKS) {
      const el = document.getElementById(l.id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, []);

  return (
    <WaitlistContext.Provider value={(kind = "beta") => setDialog(kind)}>
      <div ref={root} id="top" className="lp bg-background text-foreground relative min-h-screen overflow-x-clip">
        <FrameRails />
        <header className="sticky top-0 z-50">
          <Navbar active={active} signedIn={signedIn} />
        </header>
        <main className="relative">
          <Hero />
          <FrameLine />
          <HowItWorks />
          <FrameLine />
          <DashboardTour />
          <FrameLine />
          <Pricing today={today} />
          <FrameLine />
          <Faq />
          <FrameLine />
          <WaitlistCta />
        </main>
        <FrameLine />
        <div className="relative [&>footer]:border-t-0">
          <LegalFooter containerClassName={cn(FRAME, "px-[clamp(20px,4vw,40px)] pt-10 pb-14")}>
            <Link
              href="/unsubscribe"
              className="hover:text-foreground focus-visible:ring-ring rounded-sm underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
            >
              Unsubscribe
            </Link>
          </LegalFooter>
        </div>
      </div>
      <WaitlistDialog kind={dialog} onClose={() => setDialog(null)} />
    </WaitlistContext.Provider>
  );
}
