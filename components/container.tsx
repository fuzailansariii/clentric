import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

interface ContainerProps extends ComponentProps<"div"> {
  maxWidth?: string;
}

export function Container({
  className,
  maxWidth = "max-w-7xl",
  ...props
}: ContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full min-w-0",
        maxWidth,
        "px-4 sm:px-6 lg:px-8",
        className,
      )}
      {...props}
    />
  );
}
