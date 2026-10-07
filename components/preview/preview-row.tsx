import React from "react";

type PreviewRowProps = {
  label: React.ReactNode;
  value: React.ReactNode;
  emphasize?: boolean;
};

export default function PreviewRow({
  label,
  value,
  emphasize,
}: PreviewRowProps) {
  return (
    <div className="flex items-center justify-between border-b py-4 font-mono font-medium">
      <span
        className={
          emphasize
            ? "text-muted-foreground text-sm font-bold"
            : "text-muted-foreground text-xs"
        }
      >
        {label}
      </span>
      <span
        className={
          emphasize
            ? "text-primary text-sm font-bold"
            : "text-[10px] font-medium"
        }
      >
        {value}
      </span>
    </div>
  );
}
