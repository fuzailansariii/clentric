"use client";
import { Menu } from "lucide-react";
import { useSidebar } from "./sidebar-provider";
import { AvatarInitials } from "../ui/avatar-initials";
import { DashboardLogoLink } from "./dashboard-logo-link";
import { DropdownMenu, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { NewMenu } from "../dashboard/new-menu";
import { TopBarButton } from "./top-bar-button";
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
    <div className="grid h-14 grid-cols-[1fr_auto_1fr] items-center border-b px-4 md:hidden">
      <TopBarButton
        onClick={openMobile}
        aria-label="Open menu"
        className="-ml-3 justify-self-start"
      >
        <Menu className="size-5" />
      </TopBarButton>
      <DashboardLogoLink />
      <div className="-mr-2 flex items-center justify-self-end">
        <NewMenu variant="icon" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <TopBarButton aria-label="Account menu">
              <AvatarInitials
                name={user.name}
                size="sm"
                shape="circle"
                variant="accent"
                className="size-8 text-[11px]"
              />
            </TopBarButton>
          </DropdownMenuTrigger>
          <AccountMenuContent
            user={user}
            plan={plan}
            onLogoutClick={onLogoutClick}
            side="bottom"
          />
        </DropdownMenu>
      </div>
    </div>
  );
}
