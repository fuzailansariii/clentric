"use client";
import { useState } from "react";
import { ArrowUp, ChevronsUpDown } from "lucide-react";
import { useSidebar } from "./sidebar-provider";
import { useRouter } from "next/navigation";

type SidebarFooterProps = {
  user: { name: string; email: string; avatarUrl?: string };
  plan: "free" | "pro" | "agency";
  onProfileClick?: () => void;
  onBillingClick?: () => void;
  onLogoutClick?: () => void;
};

function getInitials(name: string) {
  const parts = name.trim().split(" ").filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export default function SidebarFooter({
  user,
  plan,
  onProfileClick,
  onBillingClick,
  onLogoutClick,
}: SidebarFooterProps) {
  const { isCollapsed } = useSidebar();
  const [menuOpen, setMenuOpen] = useState(false);

  const router = useRouter();

  const handleUpgradeClick = () => {
    router.push("/settings/billing");
  };

  const planLabel =
    plan === "free" ? "Free plan" : plan === "pro" ? "Pro plan" : "Agency plan";

  return (
    <div className="relative w-full border-t px-3 py-3">
      {isCollapsed && (
        <span
          className={`mx-auto mb-2 block h-1.5 w-1.5 rounded-full ${
            plan === "free" ? "bg-sidebar-foreground/40" : "bg-amber-500"
          }`}
          aria-hidden="true"
        />
      )}

      <div className="relative">
        <div
          className={`flex w-full items-center gap-2 rounded-md p-1 ${
            isCollapsed ? "justify-center" : ""
          }`}
        >
          <div className="bg-secondary border-border flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border">
            <span className="text-secondary-foreground font-mono text-sm font-extrabold">
              {getInitials(user.name)}
            </span>
          </div>

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
                      onClick={handleUpgradeClick}
                      className="flex cursor-pointer items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-medium text-amber-600 hover:bg-amber-500/15 dark:text-amber-500"
                    >
                      <ArrowUp size={12} />
                      <span>Pro</span>
                    </button>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="hover:bg-sidebar-accent/80 cursor-pointer rounded-xl p-3"
              >
                <ChevronsUpDown
                  size={14}
                  className="text-muted-foreground shrink-0"
                />
              </button>
            </>
          )}
        </div>

        {menuOpen && !isCollapsed && (
          <div
            role="menu"
            className="bg-card absolute bottom-full left-0 mb-2 w-full rounded-md border py-1 text-sm shadow-lg"
          >
            <button
              role="menuitem"
              onClick={onProfileClick}
              className="hover:bg-sidebar-accent/50 w-full px-3 py-2 text-left"
            >
              Profile
            </button>
            <button
              role="menuitem"
              onClick={onBillingClick}
              className="hover:bg-sidebar-accent/50 w-full px-3 py-2 text-left"
            >
              Billing
            </button>
            <button
              role="menuitem"
              onClick={onLogoutClick}
              className="text-destructive hover:bg-sidebar-accent/50 w-full px-3 py-2 text-left"
            >
              Log out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
