"use client";
import React from "react";
import { ThemeToggle } from "./ui/theme-toggle";

export default function AdminSidebar() {
  return (
    <div className="hidden md:block bg-sidebar">
      <span>AdminSidebar</span>
      <ThemeToggle />
    </div>
  );
}
