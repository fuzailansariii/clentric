import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { CustomButton } from "@/components/ui/custom-button";
import { Field } from "@/components/ui/input";
import { Badge } from "@/components/ui/status-badge";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import React from "react";

export default function Home() {
  return (
    <div>
      <Logo className="" />
      {/* <Field className="" label="Fuzail Ansari" />
      <Button variant={"default"} className="w-full">
        Fuzail
      </Button>
      <Badge status="warning">Fuzail</Badge>
      <CustomButton variant="primary">Fuzail</CustomButton>
      */}
      <ThemeToggle />
    </div>
  );
}
