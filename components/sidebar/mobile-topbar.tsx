"use client";
import { Menu } from "lucide-react";
import { useSidebar } from "./sidebar-provider";
import { AvatarInitials } from "../ui/avatar-initials";

export function MobileTopBar({ name }: { name: string }) {
  const { openMobile } = useSidebar();
  return (
    <div className="flex h-14 items-center justify-between border-b px-4 md:hidden">
      <button type="button" onClick={openMobile} aria-label="Open menu">
        <Menu size={20} />
      </button>
      <span className="font-space text-xl font-medium">Clentric</span>
      <AvatarInitials name={name} size="sm" shape="circle" variant="accent" />
    </div>
  );
}
