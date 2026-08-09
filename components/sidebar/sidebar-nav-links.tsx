"use client";

import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { label: string; href: string; icon: LucideIcon };

export function SidebarNavLink({
  item,
  isCollapsed = false,
  onClick,
}: {
  item: NavItem;
  isCollapsed?: boolean;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const Icon = item.icon;
  const isActive =
    pathname === item.href || pathname.startsWith(item.href + "/");

  return (
    <Link
      href={item.href}
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "text-sidebar-foreground relative flex items-center gap-3 rounded-lg px-3 py-2.5 font-sans text-sm",
        isCollapsed && "sidebar-foreground justify-center px-0",
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
          : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground",
      )}
    >
      <Icon size={18} className="shrink-0" />
      {!isCollapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
}
