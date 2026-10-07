"use client";

import { useState } from "react";
import Image from "next/image";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  /** Display URL from logoSrc(); null shows the initials. */
  src: string | null;
  name: string;
  className?: string;
  fallbackShape?: "square" | "circle";
};

export function BrandLogo({
  src,
  name,
  className,
  fallbackShape = "square",
}: BrandLogoProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (!src || failedSrc === src) {
    return (
      <AvatarInitials
        name={name}
        size="lg"
        shape={fallbackShape}
        variant="accent"
      />
    );
  }

  return (
    <Image
      src={src}
      alt={`${name} logo`}
      width={320}
      height={128}
      unoptimized
      loading="eager"
      referrerPolicy="no-referrer"
      onError={() => setFailedSrc(src)}
      // Logos are made for white paper; dark ones vanish on a dark theme.
      className={cn(
        "h-11 w-auto max-w-40 object-contain dark:rounded-md dark:bg-white dark:p-1",
        className,
      )}
    />
  );
}
