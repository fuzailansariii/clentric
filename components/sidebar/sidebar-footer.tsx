"use client";
import { ArrowUp, ChevronsUpDown } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useInDrawer, useSidebar } from "./sidebar-provider";
import { useIsCurrentPage } from "@/hooks/use-is-current-page";
import { AvatarInitials } from "../ui/avatar-initials";
import { DropdownMenu, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import {
  AccountMenuContent,
  PLAN_LABELS,
  type AccountMenuUser,
  type Plan,
} from "./account-menu";

type SidebarFooterProps = {
  user: AccountMenuUser & { avatarUrl?: string };
  plan: Plan;
  onLogoutClick?: () => void | Promise<void>;
};

const BILLING_HREF = "/settings/billing";

/** Account section at the bottom of the desktop sidebar. */
export default function SidebarFooter({
  user,
  plan,
  onLogoutClick,
}: SidebarFooterProps) {
  const { isCollapsed: collapsedState, closeMobile } = useSidebar();
  const inDrawer = useInDrawer();
  const isCollapsed = collapsedState && !inDrawer;
  const isCurrentPage = useIsCurrentPage();

  // Collapsed: the avatar itself opens the account menu, so Profile,
  // Billing and Log out stay reachable without expanding the sidebar.
  if (isCollapsed) {
    return (
      <div className="flex w-full justify-center border-t px-3 py-3">
        <DropdownMenu>
          {/* Tooltip wraps the menu trigger, so hover shows who is signed
              in and click still opens the menu. */}
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Account menu"
                  className="hover:bg-sidebar-accent/80 data-[state=open]:bg-sidebar-accent/80 cursor-pointer rounded-xl p-1"
                >
                  <AvatarInitials name={user.name} />
                </button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="right">{user.name}</TooltipContent>
          </Tooltip>
          <AccountMenuContent
            user={user}
            plan={plan}
            onLogoutClick={onLogoutClick}
            side="right"
          />
        </DropdownMenu>
      </div>
    );
  }

  return (
    <div
      className={cn("relative w-full px-3 py-3", !inDrawer && "border-t")}
    >
      <div
        className={cn(
          "flex w-full items-center gap-2 rounded-md p-1",
          // Drawer: the whole row is the menu button, like a phone app.
          inDrawer &&
            "has-data-[state=open]:bg-sidebar-accent active:bg-sidebar-accent/60 relative gap-3 rounded-lg p-2",
        )}
      >
        <AvatarInitials
          name={user.name}
          shape={inDrawer ? "circle" : "square"}
        />

        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 text-left">
          <span className="truncate font-sans text-sm">{user.name}</span>

          {/* Current plan is always shown; the upgrade nudge only on free. */}
          <div className="flex items-center gap-2 font-sans">
            <span className="text-muted-foreground text-xs">
              {PLAN_LABELS[plan]}
            </span>
            {plan === "free" && (
              <Link
                href={BILLING_HREF}
                onClick={(event) => {
                  if (isCurrentPage(BILLING_HREF)) event.preventDefault();
                  closeMobile();
                }}
                aria-label="Upgrade to Pro"
                className="relative z-10 flex cursor-pointer items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-medium text-amber-600 hover:bg-amber-500/15 dark:text-amber-500"
              >
                <ArrowUp size={12} />
                <span>Pro</span>
              </Link>
            )}
          </div>
        </div>

        {inDrawer && (
          <ChevronsUpDown size={16} className="text-muted-foreground shrink-0" />
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Account menu"
              className={
                inDrawer
                  ? "focus-visible:ring-ring absolute inset-0 cursor-pointer rounded-lg focus-visible:ring-2 focus-visible:outline-none"
                  : "hover:bg-sidebar-accent/80 data-[state=open]:bg-sidebar-accent/80 cursor-pointer rounded-xl p-3"
              }
            >
              {!inDrawer && (
                <ChevronsUpDown
                  size={14}
                  className="text-muted-foreground shrink-0"
                />
              )}
            </button>
          </DropdownMenuTrigger>
          <AccountMenuContent
            user={user}
            plan={plan}
            onLogoutClick={onLogoutClick}
          />
        </DropdownMenu>
      </div>
    </div>
  );
}
