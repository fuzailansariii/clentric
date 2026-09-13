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
        "mx-5 flex h-full max-h-full flex-col justify-evenly gap-8 overflow-hidden px-5 py-10",
        className,
      )}
    >
      {/* Logo Section */}
      <div className="flex items-center gap-2">
        <div className="bg-primary flex size-10 items-center justify-center rounded-2xl">
          <LayoutGrid className="text-primary-foreground size-5" />
        </div>
        <div className="flex flex-col">
          <span className="font-heading font-semibold tracking-tight">
            {logo}
          </span>
          <span className="text-muted-foreground text-xs leading-none">
            {tagline}
          </span>
        </div>
      </div>

      {/* Title, Description */}
      <div className="flex max-w-xs flex-col gap-2">
        <h2 className="font-heading text-[30px] leading-[1.2] font-bold tracking-tight">
          {title}
        </h2>
        {description && (
          <p className="text-muted-foreground max-w-68 font-sans text-sm tracking-tight">
            {description}
          </p>
        )}
      </div>

      {/* Features */}
      <div className="divide-border flex flex-col divide-y">
        {features?.map((item, idx) => (
          <div
            key={idx}
            className="flex items-center gap-4 py-3 first:pt-0 last:pb-0"
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
              <p className="text-muted-foreground text-xs">
                {item.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Testimonial — only renders if a real quote is supplied */}
      {testimonial && (
        <div className="border-border bg-muted/50 max-w-xs rounded-xl border p-4">
          <p className="text-foreground font-sans text-sm leading-relaxed italic">
            `&quot;`{testimonial.quote}`&quot;`
          </p>
          <div className="mt-3 flex items-center gap-2.5">
            <div className="bg-accent text-accent-foreground flex size-7 items-center justify-center rounded-full text-[11px] font-semibold">
              {testimonial.initials}
            </div>
            <div className="font-sans">
              <p className="text-xs leading-tight font-semibold">
                {testimonial.name}
              </p>
              <p className="text-muted-foreground text-[11px] leading-tight">
                {testimonial.role}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Trust badge */}
      {trustBadge && (
        <h2 className="text-primary font-space bg-chart-2/20 w-fit cursor-pointer rounded-full px-3 py-2 text-xs font-medium">
          {trustBadge}
        </h2>
      )}
    </div>
  );
}
