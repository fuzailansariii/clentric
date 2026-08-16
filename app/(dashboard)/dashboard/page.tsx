import WelcomeHeader from "@/components/dashboard/welcome-header";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import React from "react";

export default function Dashboard() {
  return (
    <div>
      <WelcomeHeader name="Fuzail Ansari" />
      <ThemeToggle />
    </div>
  );
}
