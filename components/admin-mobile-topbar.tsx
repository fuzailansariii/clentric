"use client";
import { useState } from "react";
import { Logo } from "./logo";
import { X } from "lucide-react";

export default function AdminMobileTopbar() {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex md:hidden fixed top-0 bg-sidebar px-5 py-3 w-full border-b border-sidebar-border z-40">
      <div className="flex items-center justify-between w-full">
        <Logo />
        <button
          type="button"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex flex-col gap-1 justify-center items-center h-6 w-6"
        >
          {open ? (
            <X />
          ) : (
            <>
              <span className="h-px w-5 bg-sidebar-foreground" />
              <span className="h-px w-5 bg-sidebar-foreground" />
              <span className="h-px w-5 bg-sidebar-foreground" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
