"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRightIcon, PlusIcon } from "lucide-react";
import { LEGAL } from "@/lib/legal-config";
import { PRICING } from "@/lib/plans";
import { cn } from "@/lib/utils";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { H2, SECTION, Eyebrow } from "./parts";

type Cat = "Beta" | "Product" | "Payments";
const CATS = ["All", "Beta", "Product", "Payments"] as const;

const FAQS: { q: string; a: string; cat: Cat }[] = [
  {
    cat: "Payments",
    q: "Does Clentric handle payments?",
    a: "No, and on purpose. Clentric never moves money. Clients pay you the way they already do; you mark the invoice paid and Clentric keeps the record straight.",
  },
  {
    cat: "Product",
    q: "Do my clients need an account?",
    a: "Never. They open a link to read and accept your proposal, and invoices reach them by email with the PDF attached. No sign-up, no password.",
  },
  {
    cat: "Beta",
    q: "When do I get access?",
    a: "Clentric opens as an invite-only beta in mid-October 2026. Join the waitlist and we’ll email you once, when your invite is ready.",
  },
  {
    cat: "Beta",
    q: "What will it cost?",
    a: `Everything is free during the beta. After that, Free covers your first client, Pro is $${PRICING.pro.price.monthly} a month for unlimited everything, and Agency arrives on ${PRICING.agency.launchDateLabel} for teams. Prices in USD, cancel anytime.`,
  },
  {
    cat: "Payments",
    q: "Which currencies can I invoice in?",
    a: "USD for now. Clients anywhere can pay in USD, and more currencies are on the roadmap.",
  },
  {
    cat: "Beta",
    q: "Can I give feedback?",
    a: "Please do. Early users can write in any time, and a real person reads every message.",
  },
];

export function Faq() {
  const [cat, setCat] = useState<(typeof CATS)[number]>("All");
  const [open, setOpen] = useState(0);
  const shown = FAQS.map((f, i) => ({ ...f, i })).filter((f) => cat === "All" || f.cat === cat);

  return (
    <section id="faq" aria-labelledby="faq-h" className={SECTION}>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] items-start gap-x-[clamp(28px,5vw,80px)] gap-y-10">
        <div className="flex flex-col gap-7 min-[760px]:sticky min-[760px]:top-24">
          <div>
            <div data-rv="0">
              <Eyebrow>FAQ</Eyebrow>
            </div>
            <h2 id="faq-h" data-rv="80" className={cn(H2, "mt-3 text-[clamp(32px,3.4vw,42px)]")}>
              Good questions.
            </h2>
          </div>
          <div data-rv="140">
            <SegmentedControl
              label="Filter questions"
              variant="chips"
              value={cat}
              onChange={(c) => {
                setCat(c);
                setOpen(FAQS.findIndex((f) => c === "All" || f.cat === c));
              }}
              itemClassName="px-3.5 aria-[pressed=false]:border-(--lp-border-strong)"
              options={CATS.map((c) => ({
                value: c,
                label: (
                  <>
                    {c}
                    <span className="font-space text-[12.5px] opacity-70">
                      {c === "All" ? FAQS.length : FAQS.filter((f) => f.cat === c).length}
                    </span>
                  </>
                ),
              }))}
            />
          </div>
          <div data-rv="160" className="bg-card flex flex-col gap-3.5 rounded-[14px] border p-5">
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className="font-space grid size-11 flex-none place-items-center rounded-full bg-(--lp-accent-bg) text-[15px] font-semibold text-(--lp-accent-fg)">
                MF
              </span>
              <div>
                <div className="text-[15px] font-semibold">Still curious?</div>
                <div className="text-sm text-(--lp-muted)">Questions go to Fuzail, who builds Clentric.</div>
              </div>
            </div>
            <Link
              href={LEGAL.routes.contact}
              className="flex h-11 items-center justify-between gap-2.5 rounded-md border border-(--lp-border-strong) px-4 text-[15px] font-medium transition-colors hover:bg-(--lp-hover)"
            >
              Write to us
              <ArrowRightIcon className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div data-rv="120" className="flex flex-col gap-2.5">
          {shown.map((f, k) => {
            const on = open === f.i;
            const id = `faq-${f.i}`;
            return (
              <div
                key={`${cat}-${f.q}`}
                className={cn(
                  "rounded-xl border transition-[background,border-color] duration-300 animate-[lp-in_.4s_both]",
                  on ? "bg-card border-(--lp-border-strong)" : "border-border",
                )}
              >
                <h3>
                  <button
                    type="button"
                    aria-expanded={on}
                    aria-controls={id}
                    onClick={() => setOpen(on ? -1 : f.i)}
                    className="grid min-h-16 w-full cursor-pointer grid-cols-[36px_minmax(0,1fr)_32px] items-center gap-3 py-3.5 pr-4 pl-5 text-left text-[17px] font-medium"
                  >
                    <span className="font-space text-[13.5px] text-(--lp-muted)">{String(k + 1).padStart(2, "0")}</span>
                    <span>{f.q}</span>
                    <span
                      aria-hidden="true"
                      className={cn(
                        "grid size-8 place-items-center rounded-full transition-[transform,background,color] duration-350 ease-[cubic-bezier(.6,0,.2,1)]",
                        on ? "bg-primary text-primary-foreground rotate-45" : "bg-(--lp-sunk) text-(--lp-muted)",
                      )}
                    >
                      <PlusIcon className="size-4" />
                    </span>
                  </button>
                </h3>
                <div
                  id={id}
                  className="grid transition-[grid-template-rows] duration-400 ease-[cubic-bezier(.6,0,.2,1)]"
                  style={{ gridTemplateRows: on ? "1fr" : "0fr" }}
                >
                  <div className="overflow-hidden" inert={!on}>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pr-6 pb-5 pl-17">
                      <p className="text-base leading-[1.6] text-pretty text-(--lp-muted)">{f.a}</p>
                      <span className="inline-flex h-5.5 items-center rounded-full bg-(--lp-sunk) px-2.25 text-xs font-medium text-(--lp-muted)">
                        {f.cat}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
