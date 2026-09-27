"use client";

import type { ComponentProps } from "react";
import { ArrowUp, CreditCard, LogOut, Settings, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSidebar } from "./sidebar-provider";
import { useIsCurrentPage } from "@/hooks/use-is-current-page";
import { DEFAULT_SETTINGS_HREF } from "@/app/(dashboard)/settings/sections";
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "../ui/dropdown-menu";

export type AccountMenuUser = { name: string; email: string };

export type Plan = "free" | "pro" | "agency";

export const PLAN_LABELS: Record<Plan, string> = {
  free: "Free plan",
  pro: "Pro plan",
  agency: "Agency plan",
};

type AccountMenuContentProps = {
  user: AccountMenuUser;
  plan: Plan;
  onLogoutClick?: () => void | Promise<void>;
  side?: ComponentProps<typeof DropdownMenuContent>["side"];
  align?: ComponentProps<typeof DropdownMenuContent>["align"];
};

/**
 * Account menu items, shared by the desktop sidebar footer and the mobile
 * topbar avatar. Render inside a <DropdownMenu> next to its trigger.
 */
export function AccountMenuContent({
  user,
  plan,
  onLogoutClick,
  side = "top",
  align = "end",
}: AccountMenuContentProps) {
  const { closeMobile } = useSidebar();
  const router = useRouter();
  const isCurrentPage = useIsCurrentPage();

  // Navigating also closes the mobile drawer, like the nav links do. The
  // page you're already on isn't refetched; the menu just closes.
  const go = (href: string) => {
    closeMobile();
    if (!isCurrentPage(href)) router.push(href);
  };

  return (
    <DropdownMenuContent side={side} align={align} className="w-56">
      <DropdownMenuLabel className="flex flex-col gap-0.5 font-normal">
        <span className="truncate text-sm font-medium">{user.name}</span>
        {user.email && (
          <span className="text-muted-foreground truncate text-xs">
            {user.email}
          </span>
        )}
      </DropdownMenuLabel>
      <div className="flex items-center gap-1.5 px-2 pb-1.5">
        <span className="text-muted-foreground bg-muted rounded-md px-1.5 py-0.5 text-[11px] font-medium">
          {PLAN_LABELS[plan]}
        </span>
        {/* A small menu item (not a plain button) so arrow keys reach it. */}
        {plan === "free" && (
          <DropdownMenuItem
            onClick={() => go("/settings/billing")}
            aria-label="Upgrade to Pro"
            className="gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-medium text-amber-600 focus:bg-amber-500/15 focus:text-amber-600 dark:text-amber-500 dark:focus:text-amber-500"
          >
            <ArrowUp className="size-3 text-current" />
            Pro
          </DropdownMenuItem>
        )}
      </div>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onClick={() => go("/settings/account")}
        className="items-center"
      >
        <User className="size-3.5" />
        Profile
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={() => go("/settings/billing")}
        className="items-center"
      >
        <CreditCard className="size-3.5" />
        Billing
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={() => go(DEFAULT_SETTINGS_HREF)}
        className="items-center"
      >
        <Settings className="size-3.5" />
        Settings
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        variant="destructive"
        // Called with no arguments: this is a server action, and
        // the click event can't be sent to the server.
        onClick={() => void onLogoutClick?.()}
        className="items-center"
      >
        <LogOut className="size-3.5" />
        Log out
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
}
