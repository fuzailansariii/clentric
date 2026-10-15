"use client";

import { useHydrated } from "@/hooks/use-hydrated";

type WelcomeHeaderProps = {
  name: string;
  /** No clients, proposals or invoices yet: welcome them instead of a greeting. */
  isNewUser?: boolean;
  /** Short status shown after the date, e.g. "Nothing needs you right now." */
  status?: string;
};

function getGreeting(now: Date) {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function WelcomeHeader({
  name,
  isNewUser = false,
  status,
}: WelcomeHeaderProps) {
  // The server runs in UTC: greeting and date wait for the viewer's clock.
  const hydrated = useHydrated();
  const now = new Date();
  const today = hydrated
    ? now.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    : null;
  // A no-break space keeps the line's height before the date arrives.
  const line = [today, status].filter(Boolean).join(" · ") || "\u00a0";

  return (
    <div className="flex flex-col gap-1">
      <h1 className="font-space text-2xl font-medium">
        {isNewUser
          ? `Welcome to Clentric, ${name}`
          : `${hydrated ? getGreeting(now) : "Welcome back"}, ${name}`}
      </h1>
      <p className="text-muted-foreground text-sm">
        {line}
      </p>
    </div>
  );
}
