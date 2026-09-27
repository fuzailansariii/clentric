"use client";
import { Menu } from "lucide-react";
import { useSidebar } from "./sidebar-provider";
import { AvatarInitials } from "../ui/avatar-initials";
import { DashboardLogoLink } from "./dashboard-logo-link";
import { DropdownMenu, DropdownMenuTrigger } from "../ui/dropdown-menu";
import {
  AccountMenuContent,
  type AccountMenuUser,
  type Plan,
} from "./account-menu";

type MobileTopBarProps = {
  user: AccountMenuUser;
  plan: Plan;
  onLogoutClick?: () => void | Promise<void>;
};

export function MobileTopBar({ user, plan, onLogoutClick }: MobileTopBarProps) {
  const { openMobile } = useSidebar();
  return (
    <div className="flex h-14 items-center justify-between border-b px-4 md:hidden">
      <button type="button" onClick={openMobile} aria-label="Open menu">
        <Menu size={20} />
      </button>
      <DashboardLogoLink />
      {/* The avatar opens the account menu, as in most mobile SaaS apps. */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Account menu"
            className="cursor-pointer rounded-full"
          >
            <AvatarInitials
              name={user.name}
              size="sm"
              shape="circle"
              variant="accent"
            />
          </button>
        </DropdownMenuTrigger>
        <AccountMenuContent
          user={user}
          plan={plan}
          onLogoutClick={onLogoutClick}
          side="bottom"
        />
      </DropdownMenu>
    </div>
  );
}
