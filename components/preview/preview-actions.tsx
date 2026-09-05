import React from "react";
import { CustomButton } from "@/components/ui/custom-button";

type ActionButton = {
  label: string;
  variant: "primary" | "secondary" | "ghost";
  onClick: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
};

type PreviewActionsProps = {
  actions: ActionButton[];
};

export default function PreviewActions({ actions }: PreviewActionsProps) {
  return (
    <div className="mt-4 flex w-full flex-col items-center gap-3">
      {actions.map((action) => (
        <CustomButton
          key={action.label}
          type="button"
          variant={action.variant}
          onClick={action.onClick}
          disabled={action.disabled}
          className="w-full"
        >
          {action.icon}
          {action.label}
        </CustomButton>
      ))}
    </div>
  );
}
