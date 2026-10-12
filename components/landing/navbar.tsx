"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  FileTextIcon,
  FolderIcon,
  LogOutIcon,
  ReceiptIcon,
  UsersIcon,
} from "lucide-react";
import { LogoMark } from "@/components/logo";
import { LinkProgress } from "@/components/ui/link-progress";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { logoutToHomeAction } from "@/app/(auth)/action";
import { cn } from "@/lib/utils";
import { FRAME, FrameLine, FrameRails } from "./parts";
import { useOpenWaitlist } from "./waitlist-context";

const PRODUCT = [
  {
    icon: UsersIcon,
    title: "Clients",
    body: "Contacts, notes and payment history in one record.",
    href: "#how",
  },
  {
    icon: FileTextIcon,
    title: "Proposals",
    body: "Send a link. Know the moment it’s read.",
    href: "#how",
  },
  {
    icon: FolderIcon,
    title: "Projects",
    body: "Milestones and deadlines next to the work.",
    href: "#how",
  },
  {
    icon: ReceiptIcon,
    title: "Invoices",
    body: "Track what’s paid, due and overdue.",
    href: "#dashboard",
  },
];

export const NAV_LINKS = [
  { id: "how", label: "How it works" },
  { id: "dashboard", label: "Dashboard" },
  { id: "pricing", label: "Pricing" },
  { id: "faq", label: "FAQ" },
] as const;

const EASE = "cubic-bezier(.2,.7,.2,1)";

const BTN =
  "relative inline-flex h-8.5 cursor-pointer items-center justify-center gap-1.5 rounded-[6px] border px-3 text-sm leading-none font-medium whitespace-nowrap transition-[background,border-color,color,transform] active:translate-y-px";
const GHOST =
  "border-transparent text-(--lp-muted) hover:bg-(--lp-hover) hover:text-foreground";
const PRIMARY =
  "group/btn border-[color-mix(in_srgb,var(--primary)_80%,#000)] bg-primary pr-2.5 pl-3.25 text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,.16),0_1px_2px_rgba(17,17,17,.12)] hover:bg-(--lp-primary-hover)";
const OUTLINE =
  "border-(--lp-border-strong) bg-card text-foreground hover:bg-(--lp-hover)";

export function Navbar({
  active,
  signedIn,
}: {
  active: string;
  signedIn: boolean;
}) {
  const openWaitlist = useOpenWaitlist();
  const [open, setOpen] = useState(false);
  const [prod, setProd] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [ind, setInd] = useState({ x: 0, w: 0, o: 0 });
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const hiddenRef = useRef(false);

  // Glass once scrolled; slides away on the way down, back on the way up.
  useEffect(() => {
    let last = window.scrollY;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const y = window.scrollY;
        const dy = y - last;
        last = y;
        const h = hiddenRef.current;
        const next = y < 160 ? false : dy > 8 ? true : dy < -4 ? false : h;
        hiddenRef.current = next;
        setScrolled(y > 8);
        setHidden(next);
        if (next) setProd(false);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setProd(false);
      }
    };
    const onResize = () => {
      if (window.innerWidth >= 1024) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      clearTimeout(closeTimer.current);
    };
  }, []);

  // The full-screen phone menu locks the page behind it.
  useEffect(() => {
    if (!open || window.innerWidth >= 700) return;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  const canHover = () => window.matchMedia("(hover: hover)").matches;
  const moveInd = (el: HTMLElement) =>
    setInd({ x: el.offsetLeft, w: el.offsetWidth, o: 1 });
  const closeAll = () => {
    setOpen(false);
    setProd(false);
  };
  const startProdClose = () => {
    if (!canHover()) return;
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setProd(false), 160);
  };
  const startWaitlist = () => {
    closeAll();
    openWaitlist();
  };

  const isHidden = hidden && !open && !prod;

  return (
    <div className="relative z-50 text-sm leading-[1.45] tracking-[-0.005em]">
      {/* Tablet scrim behind the dropped-down menu. */}
      <div
        aria-hidden="true"
        onClick={closeAll}
        className={cn(
          "absolute inset-x-0 top-full hidden h-screen bg-[rgba(17,17,17,.18)] transition-opacity duration-300 min-[700px]:max-lg:block dark:bg-black/60",
          open ? "visible opacity-100" : "invisible opacity-0",
        )}
      />

      <div
        className={cn(
          // Tailwind v4 translate utilities set `translate`, not `transform`.
          "relative z-2 transition-[translate,background-color] duration-[450ms,300ms] motion-reduce:transition-none",
          scrolled &&
            !open &&
            "bg-(--lp-glass) backdrop-blur-lg backdrop-saturate-160",
          open && "bg-card",
          isHidden && "-translate-y-full",
        )}
        style={{ transitionTimingFunction: EASE }}
      >
        <FrameRails />
        <div
          className={cn(
            FRAME,
            "relative flex items-stretch",
            "h-12",
          )}
        >
          <Link
            href="#top"
            onClick={closeAll}
            aria-label="Clentric home"
            className="group flex items-center gap-2.25 border-r border-(--lp-frame) px-4 text-[15px] font-semibold tracking-[-0.015em] sm:px-5"
          >
            <LogoMark
              aria-hidden="true"
              className="size-6 rounded-[6px] transition-transform duration-500 group-hover:-rotate-6"
            />
            <span>Clentric</span>
          </Link>

          <nav
            aria-label="Primary"
            onMouseLeave={() => setInd((x) => ({ ...x, o: 0 }))}
            className="relative hidden items-center px-2 lg:flex"
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-0 -mt-4.25 h-8.5 rounded-[6px] bg-(--lp-hover) transition-[transform,width,opacity] duration-[320ms,320ms,180ms]"
              style={{
                transform: `translateX(${ind.x}px)`,
                width: ind.w,
                opacity: ind.o,
              }}
            />
            <button
              type="button"
              aria-expanded={prod}
              aria-controls="lp-product"
              onClick={() => setProd((p) => !p)}
              onMouseEnter={(e) => {
                moveInd(e.currentTarget);
                if (!canHover()) return;
                clearTimeout(closeTimer.current);
                setProd(true);
              }}
              onMouseLeave={startProdClose}
              onFocus={(e) => moveInd(e.currentTarget)}
              className={cn(
                "hover:text-foreground relative z-1 inline-flex h-8.5 cursor-pointer items-center gap-1.25 rounded-[6px] px-3 font-medium whitespace-nowrap transition-colors",
                prod ? "text-foreground" : "text-(--lp-muted)",
              )}
            >
              Product
              <ChevronDownIcon
                aria-hidden="true"
                className={cn(
                  "size-3.75 text-(--lp-faint) transition-transform duration-300",
                  prod && "rotate-180",
                )}
              />
            </button>

            <div
              id="lp-product"
              onMouseEnter={() => clearTimeout(closeTimer.current)}
              onMouseLeave={startProdClose}
              className={cn(
                "bg-card absolute top-[calc(100%+12px)] left-1/2 -ml-75 w-150 origin-top overflow-hidden rounded-xl border shadow-(--lp-pop) before:absolute before:inset-x-0 before:-top-3.5 before:h-3.5",
                prod
                  ? "visible translate-y-0 scale-100 opacity-100"
                  : "invisible -translate-y-1 scale-[.985] opacity-0",
              )}
              style={{
                transition: prod
                  ? `opacity .18s, translate .3s ${EASE}, scale .3s ${EASE}, visibility 0s`
                  : `opacity .18s, translate .3s ${EASE}, scale .3s ${EASE}, visibility 0s .3s`,
              }}
            >
              <div className="p-2">
                <span className="block px-3 pt-2 pb-1.5 text-xs font-medium text-(--lp-faint)">
                  Product
                </span>
                <div className="grid grid-cols-2 gap-0.5">
                  {PRODUCT.map((p, i) => (
                    <ProductItem
                      key={p.title}
                      item={p}
                      onClick={closeAll}
                      style={{
                        opacity: prod ? 1 : 0,
                        transform: prod ? "none" : "translateY(4px)",
                        transition: `opacity .25s ${30 + i * 35}ms, transform .35s ${EASE} ${30 + i * 35}ms, background .18s`,
                      }}
                      arrow
                    />
                  ))}
                </div>
              </div>
              <Link
                href="#how"
                onClick={closeAll}
                className="group/f hover:text-foreground flex items-center gap-3 border-t bg-(--lp-sunk) px-5 py-3 text-[13px] text-(--lp-muted) transition-colors"
              >
                <span className="inline-flex h-5 flex-none items-center rounded-[5px] bg-(--lp-accent-bg) px-1.75 text-[11.5px] font-semibold text-(--lp-accent-fg)">
                  New
                </span>
                <span>
                  Accepted proposals now become projects automatically.
                </span>
                <span className="ml-auto inline-flex items-center gap-1 font-medium whitespace-nowrap text-(--lp-accent-fg)">
                  Learn more
                  <ArrowRightIcon
                    aria-hidden="true"
                    className="size-3.75 transition-transform group-hover/f:translate-x-0.75"
                  />
                </span>
              </Link>
            </div>

            {NAV_LINKS.map((l) => (
              <Link
                key={l.id}
                href={`#${l.id}`}
                aria-current={active === l.id ? "true" : undefined}
                onClick={closeAll}
                onMouseEnter={(e) => moveInd(e.currentTarget)}
                onFocus={(e) => moveInd(e.currentTarget)}
                className={cn(
                  "hover:text-foreground relative z-1 inline-flex h-8.5 items-center rounded-[6px] px-3 font-medium whitespace-nowrap transition-colors",
                  active === l.id
                    ? "text-foreground after:bg-primary after:absolute after:bottom-px after:left-1/2 after:-ml-0.5 after:size-1 after:animate-[lp-in_.35s_both] after:rounded-full"
                    : "text-(--lp-muted)",
                )}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-stretch">
            <div className="flex w-12 items-center justify-center border-l border-(--lp-frame)">
              <ThemeToggle className="size-8.5 rounded-[6px] border-transparent text-(--lp-muted) hover:bg-(--lp-hover)" />
            </div>
            <div className="hidden items-center gap-1 border-l border-(--lp-frame) px-3 min-[700px]:flex lg:px-4">
              {signedIn ? (
                <>
                  <form action={logoutToHomeAction} className="hidden lg:block">
                    <button
                      type="submit"
                      aria-label="Log out"
                      title="Log out"
                      className={cn(BTN, GHOST, "w-8.5 px-0")}
                    >
                      <LogOutIcon className="size-3.75" aria-hidden="true" />
                    </button>
                  </form>
                  <Link
                    href="/dashboard"
                    // Full prefetch (data too): signed-in visitors land on a ready dashboard.
                    prefetch
                    className={cn(
                      BTN,
                      PRIMARY,
                      "hidden min-[700px]:inline-flex",
                    )}
                  >
                    Go to dashboard
                    <ChevronRightIcon aria-hidden="true" className="size-3.75 transition-transform group-hover/btn:translate-x-0.5" />
                    <LinkProgress />
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className={cn(BTN, GHOST, "hidden lg:inline-flex")}
                  >
                    Log in
                  </Link>
                  <button
                    type="button"
                    onClick={startWaitlist}
                    className={cn(
                      BTN,
                      PRIMARY,
                      "hidden min-[700px]:inline-flex",
                    )}
                  >
                    Join waitlist
                    <ChevronRightIcon
                      aria-hidden="true"
                      className="size-3.75 transition-transform group-hover/btn:translate-x-0.5"
                    />
                  </button>
                </>
              )}
            </div>
            <div className="flex w-12 items-center justify-center border-l border-(--lp-frame) lg:hidden">
              <button
                type="button"
                aria-label={open ? "Close menu" : "Open menu"}
                aria-expanded={open}
                aria-controls="lp-menu"
                onClick={() => {
                  setOpen((o) => !o);
                  setProd(false);
                }}
                className="text-foreground relative size-9 cursor-pointer rounded-[6px] transition-colors hover:bg-(--lp-hover)"
              >
                <span
                  className="absolute left-2.5 h-[1.5px] w-4 rounded-[1px] bg-current transition-transform duration-400"
                  style={{
                    top: 14,
                    transform: open
                      ? "translateY(3.25px) rotate(45deg)"
                      : "none",
                  }}
                />
                <span
                  className="absolute left-2.5 h-[1.5px] w-4 rounded-[1px] bg-current transition-transform duration-400"
                  style={{
                    top: 20.5,
                    transform: open
                      ? "translateY(-3.25px) rotate(-45deg)"
                      : "none",
                  }}
                />
              </button>
            </div>
          </div>
        </div>
        <FrameLine />
      </div>

      <MobilePanel
        open={open}
        signedIn={signedIn}
        active={active}
        onClose={closeAll}
        onStart={startWaitlist}
      />
    </div>
  );
}

type ProductEntry = (typeof PRODUCT)[number];

function ProductItem({
  item,
  onClick,
  style,
  arrow = false,
  className,
}: {
  item: ProductEntry;
  onClick: () => void;
  style?: CSSProperties;
  arrow?: boolean;
  className?: string;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onClick}
      style={style}
      className={cn(
        "group/pi flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-(--lp-hover)",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="bg-card group-hover/pi:text-primary grid size-8.5 flex-none place-items-center rounded-lg border border-(--lp-border-strong) text-(--lp-muted) transition-[color,border-color,transform] duration-300 group-hover/pi:-translate-y-px group-hover/pi:border-[color-mix(in_srgb,var(--primary)_40%,transparent)]"
      >
        <Icon className="size-4.5" strokeWidth={1.6} />
      </span>
      <span className="min-w-0">
        <span className="text-foreground flex items-center gap-1.5 font-medium">
          {item.title}
          {arrow && (
            <ArrowRightIcon
              aria-hidden="true"
              className="size-3.75 -translate-x-1 text-(--lp-faint) opacity-0 transition-[opacity,transform] group-hover/pi:translate-x-0 group-hover/pi:opacity-100"
            />
          )}
        </span>
        <span className="mt-px block text-[13px] text-pretty text-(--lp-muted)">
          {item.body}
        </span>
      </span>
    </Link>
  );
}

function MobilePanel({
  open,
  signedIn,
  active,
  onClose,
  onStart,
}: {
  open: boolean;
  signedIn: boolean;
  active: string;
  onClose: () => void;
  onStart: () => void;
}) {
  // Each row fades up in turn as the panel opens.
  const stagger = (ms: number): CSSProperties => ({
    opacity: open ? 1 : 0,
    transform: open ? "none" : "translateY(8px)",
    transition: `opacity .3s ${ms}ms, transform .4s ${EASE} ${ms}ms, background .18s`,
  });

  return (
    <div
      id="lp-menu"
      aria-label="Menu"
      inert={!open}
      className={cn(
        "bg-card absolute inset-x-0 top-full block border-b shadow-(--lp-pop) lg:hidden",
        "max-[699px]:h-[calc(100dvh-49px)] max-[699px]:overflow-y-auto max-[699px]:overscroll-contain max-[699px]:border-b-0 max-[699px]:shadow-none",
        open ? "visible" : "invisible",
      )}
      style={{
        clipPath: open ? "inset(0 0 -60px 0)" : "inset(0 0 100% 0)",
        transition: open
          ? "clip-path .5s cubic-bezier(.7,0,.2,1), visibility 0s"
          : "clip-path .5s cubic-bezier(.7,0,.2,1), visibility 0s .5s",
      }}
    >
      <div className="mx-auto flex max-w-190 flex-col px-4 pt-3 pb-5 max-[699px]:min-h-full max-[699px]:px-3 max-[699px]:pt-2">
        <span
          className="block px-3 pt-2 pb-1.5 text-xs font-medium text-(--lp-faint)"
          style={stagger(80)}
        >
          Product
        </span>
        <div className="grid grid-cols-1 gap-0.5 min-[700px]:grid-cols-2">
          {PRODUCT.map((p, i) => (
            <ProductItem
              key={p.title}
              item={p}
              onClick={onClose}
              style={stagger(120 + i * 45)}
            />
          ))}
        </div>
        <div className="mt-2 flex flex-col border-t pt-2 min-[700px]:flex-row min-[700px]:flex-wrap">
          {NAV_LINKS.map((l, i) => (
            <Link
              key={l.id}
              href={`#${l.id}`}
              onClick={onClose}
              aria-current={active === l.id ? "true" : undefined}
              style={stagger(300 + i * 40)}
              className={cn(
                "flex min-h-13 items-center justify-between gap-3 border-b px-3 text-base font-medium last:border-b-0 hover:bg-(--lp-hover) min-[700px]:min-h-12 min-[700px]:flex-[1_1_45%] min-[700px]:rounded-lg min-[700px]:border-b-0 min-[700px]:text-[15px]",
                active === l.id ? "text-(--lp-accent-fg)" : "text-foreground",
              )}
            >
              {l.label}
              <ChevronRightIcon
                aria-hidden="true"
                className="size-3.75 text-(--lp-faint)"
              />
            </Link>
          ))}
        </div>
        <div
          className="mt-3 grid grid-cols-1 gap-2 border-t px-1 pt-3 max-[699px]:mt-auto max-[699px]:px-0 max-[699px]:pt-4 min-[700px]:grid-cols-2"
          style={stagger(480)}
        >
          {signedIn ? (
            <>
              <form action={logoutToHomeAction} className="contents">
                <button
                  type="submit"
                  className={cn(
                    BTN,
                    OUTLINE,
                    "h-12 w-full text-[15px] min-[700px]:h-11",
                  )}
                >
                  <LogOutIcon className="size-4" aria-hidden="true" />
                  Log out
                </button>
              </form>
              <Link
                href="/dashboard"
                prefetch
                className={cn(
                  BTN,
                  PRIMARY,
                  "h-12 text-[15px] min-[700px]:h-11",
                )}
              >
                Go to dashboard
                <ChevronRightIcon aria-hidden="true" className="size-3.75" />
                <LinkProgress />
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                onClick={onClose}
                className={cn(
                  BTN,
                  OUTLINE,
                  "h-12 text-[15px] min-[700px]:h-11",
                )}
              >
                Log in
              </Link>
              <button
                type="button"
                onClick={onStart}
                className={cn(
                  BTN,
                  PRIMARY,
                  "h-12 text-[15px] min-[700px]:h-11",
                )}
              >
                Join waitlist
                <ChevronRightIcon aria-hidden="true" className="size-3.75" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
