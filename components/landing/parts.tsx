import type { ReactNode } from "react";
import { CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** The box the frame rails sit on; on phones the rails are the screen edges. */
export const FRAME = "mx-auto w-full max-w-320 sm:w-[calc(100%-3rem)]";

export const SECTION = cn(
  FRAME,
  "px-[clamp(20px,4vw,40px)] py-[clamp(64px,7vw,104px)]",
);

export const H2 =
  "font-space text-[clamp(32px,3.8vw,48px)] leading-none font-medium tracking-[-0.045em] text-balance";

export const BTN_PRIMARY =
  "bg-primary text-primary-foreground inline-flex h-10 cursor-pointer items-center gap-2 rounded-md px-4 text-sm font-medium whitespace-nowrap transition-[background-color,scale] duration-150 hover:bg-(--lp-primary-hover) active:scale-[.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

export const BTN_OUTLINE =
  "bg-card text-foreground inline-flex h-10 items-center rounded-md border border-(--lp-border-strong) px-4 text-sm font-medium whitespace-nowrap transition-[background-color,scale] duration-150 hover:bg-(--lp-hover) active:scale-[.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

export type Tone =
  | "neutral"
  | "info"
  | "viewed"
  | "success"
  | "warning"
  | "danger";

export const TONE_CLASS: Record<Tone, string> = {
  neutral: "bg-(--lp-neutral-bg) text-(--lp-neutral-fg)",
  info: "bg-(--lp-info-bg) text-(--lp-info-fg)",
  viewed: "bg-(--lp-viewed-bg) text-(--lp-viewed-fg)",
  success: "bg-(--lp-success-bg) text-(--lp-success-fg)",
  warning: "bg-(--lp-warning-bg) text-(--lp-warning-fg)",
  danger: "bg-(--lp-danger-bg) text-(--lp-danger-fg)",
};

export function StatusPill({
  tone,
  children,
  dot = true,
  className,
}: {
  tone: Tone;
  children: ReactNode;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5.5 items-center gap-1.5 rounded-full px-2 text-xs font-medium whitespace-nowrap",
        TONE_CLASS[tone],
        className,
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="font-space text-sm font-medium text-(--lp-accent-fg)">
      {children}
    </div>
  );
}

/** Eyebrow + big title on the left, an aside (text or controls) on the right. */
export function SectionHead({
  eyebrow,
  title,
  titleId,
  aside,
  titleClassName,
}: {
  eyebrow: string;
  title: ReactNode;
  titleId: string;
  aside?: ReactNode;
  titleClassName?: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-16 gap-y-5">
      <div>
        <div data-rv="0">
          <Eyebrow>{eyebrow}</Eyebrow>
        </div>
        <h2
          id={titleId}
          data-rv="80"
          className={cn(H2, "mt-3 max-w-[14ch]", titleClassName)}
        >
          {title}
        </h2>
      </div>
      {aside && <div data-rv="160">{aside}</div>}
    </div>
  );
}

export function Tick({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap",
        className,
      )}
    >
      <CheckIcon
        className="size-3.75 text-(--lp-success-fg)"
        strokeWidth={2.4}
        aria-hidden="true"
      />
      {children}
    </span>
  );
}

/** Hidden from people and screen readers; bots fill it and get dropped. */
export function Honeypot({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="sr-only" aria-hidden="true">
      <label htmlFor={id}>Website</label>
      <input
        id={id}
        type="text"
        tabIndex={-1}
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

/** Two vertical lines down the edges of FRAME, filling the nearest positioned parent. */
export function FrameRails({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0", className)}
    >
      <div className={cn(FRAME, "h-full border-x border-(--lp-frame)")} />
    </div>
  );
}

/** Full-bleed line with a + where it crosses each rail. */
export function FrameLine({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none relative h-px", className)}
    >
      <div className="absolute inset-0 bg-(--lp-frame)" />
      <div className={cn(FRAME, "relative h-px max-sm:hidden")}>
        <FrameMark className="-left-1.5" />
        <FrameMark className="-right-1.5" />
      </div>
    </div>
  );
}

// 13px box offset by 6px: both arms sit exactly on the 1px lines.
function FrameMark({ className }: { className: string }) {
  return (
    <span
      data-frame-mark=""
      className={cn(
        "absolute -top-1.5 size-3.25",
        "before:absolute before:inset-y-0 before:left-1.5 before:w-px before:bg-(--lp-faint)",
        "after:absolute after:inset-x-0 after:top-1.5 after:h-px after:bg-(--lp-faint)",
        className,
      )}
    />
  );
}

/** Early-access pill with a pulsing dot. */
export function LaunchPill({ children }: { children: ReactNode }) {
  return (
    <span className="font-space inline-flex h-7 flex-none items-center gap-2 rounded-full bg-(--lp-accent-bg) px-3 text-[13.5px] font-medium whitespace-nowrap text-(--lp-accent-fg)">
      <span className="bg-primary size-1.75 rounded-full animate-[lp-pulse_1.8s_infinite]" />
      {children}
    </span>
  );
}
