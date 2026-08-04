"use client";
import { Menu } from "lucide-react";
import { useSidebar } from "./sidebar-provider";

export function MobileTopBar() {
  const { openMobile } = useSidebar();
  return (
    <div className="flex h-14 items-center justify-between border-b bg-white px-4 md:hidden">
      <button onClick={openMobile} aria-label="Open menu">
        <Menu size={20} />
      </button>
      <span className="font-space text-xl font-medium">Clentric</span>
      <div className="bg-accent relative flex h-7 w-7 items-center justify-center rounded-full">
        <span className="text-primary absolute font-sans text-xs font-medium">
          MF
        </span>
      </div>
    </div>
  );
}
