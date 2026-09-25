"use client";
import {
  ArrowUp,
  ChevronsUpDown,
  CreditCard,
  LogOut,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useSidebar } from "./sidebar-provider";
import { AvatarInitials } from "../ui/avatar-initials";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

type SidebarFooterProps = {
  user: { name: string; email: string; avatarUrl?: string };
  plan: "free" | "pro" | "agency";
  onLogoutClick?: () => void | Promise<void>;
};

export default function SidebarFooter({
  user,
  plan,
  onLogoutClick,
}: SidebarFooterProps) {
  const { isCollapsed, closeMobile } = useSidebar();
  const router = useRouter();

  // Navigating also closes the mobile drawer, like the nav links do.
  const go = (href: string) => {
    closeMobile();
    router.push(href);
  };

  const planLabel =
    plan === "free" ? "Free plan" : plan === "pro" ? "Pro plan" : "Agency plan";

  return (
    <div className="relative w-full border-t px-3 py-3">
      <div
        className={`flex w-full items-center gap-2 rounded-md p-1 ${
          isCollapsed ? "justify-center" : ""
        }`}
      >
        <AvatarInitials name={user.name} />

        {!isCollapsed && (
          <>
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 text-left">
              <span className="truncate font-sans text-sm">{user.name}</span>

              {plan === "free" && (
                <div className="flex items-center gap-2 font-sans">
                  <span className="text-muted-foreground px-2 py-0.5 text-[10px]">
                    {planLabel}
                  </span>
                  <button
                    type="button"
                    onClick={() => go("/settings/billing")}
                    className="flex cursor-pointer items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-medium text-amber-600 hover:bg-amber-500/15 dark:text-amber-500"
                  >
                    <ArrowUp size={12} />
                    <span>Pro</span>
                  </button>
                </div>
              )}
            </div>

            {/* Radix menu: closes on outside click and Escape, arrow keys
                move between items, focus returns to the button. */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Account menu"
                  className="hover:bg-sidebar-accent/80 data-[state=open]:bg-sidebar-accent/80 cursor-pointer rounded-xl p-3"
                >
                  <ChevronsUpDown
                    size={14}
                    className="text-muted-foreground shrink-0"
                  />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="end" className="w-52">
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
            </DropdownMenu>
          </>
        )}
      </div>
    </div>
  );
}
