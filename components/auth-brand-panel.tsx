import { cn } from "@/lib/utils";
import { LayoutGrid } from "lucide-react";
import { ReactNode } from "react";

type BrandFeature = {
  icon: ReactNode;
  title: string;
  description: string;
  iconClassName?: string;
};

type Testimonial = {
  quote: string;
  initials: string;
  name: string;
  role: string;
};

type AuthBrandPanelProps = {
  logo: ReactNode;
  tagline?: string;
  title: string;
  description?: string;
  features?: BrandFeature[];
  testimonial?: Testimonial;
  className?: string;
  trustBadge?: string;
};

export default function AuthBrandPanel({
  logo,
  title,
  description,
  features,
  testimonial,
  className,
  tagline = "Freelancer Workspace",
  trustBadge,
}: AuthBrandPanelProps) {
  return (
    <div
      className={cn(
        "mx-5 flex h-full max-h-full flex-col justify-evenly gap-8 px-5 py-10 overflow-hidden",
        className,
      )}
    >
      {/* Logo Section */}
      <div className="flex items-center gap-2">
        <div className="flex size-10 items-center justify-center rounded-2xl bg-primary">
          <LayoutGrid className="size-5 text-primary-foreground" />
        </div>
        <div className="flex flex-col">
          <span className="font-heading font-semibold tracking-tight">
            {logo}
          </span>
          <span className="text-xs leading-none text-muted-foreground">
            {tagline}
          </span>
        </div>
      </div>

      {/* Title, Description */}
      <div className="flex max-w-xs flex-col gap-2">
        <h2 className="font-heading text-[30px] font-bold leading-[1.2] tracking-tight">
          {title}
        </h2>
        {description && (
          <p className="font-sans tracking-tight max-w-68 text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      {/* Features */}
      <div className="flex flex-col divide-y divide-border">
        {features?.map((item, idx) => (
          <div
            key={idx}
            className="flex items-center py-3 gap-4 first:pt-0 last:pb-0"
          >
            <div
              className={cn(
                "flex size-10 items-center justify-center rounded-xl",
                item.iconClassName,
              )}
            >
              {item.icon}
            </div>
            <div className="font-sans">
              <span className="text-sm font-medium tracking-tight">
                {item.title}
              </span>
              <p className="text-xs text-muted-foreground">
                {item.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Testimonial — only renders if a real quote is supplied */}
      {testimonial && (
        <div className="max-w-xs rounded-xl border border-border bg-muted/50 p-4">
          <p className="font-sans text-sm italic leading-relaxed text-foreground">
            "{testimonial.quote}"
          </p>
          <div className="mt-3 flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-accent-foreground">
              {testimonial.initials}
            </div>
            <div className="font-sans">
              <p className="text-xs font-semibold leading-tight">
                {testimonial.name}
              </p>
              <p className="text-[11px] leading-tight text-muted-foreground">
                {testimonial.role}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Trust badge */}
      {trustBadge && (
        <h2 className="rounded-full w-fit cursor-pointer text-primary font-space font-medium bg-chart-2/20 text-xs px-3 py-2">
          {trustBadge}
        </h2>
      )}
    </div>
  );
}
