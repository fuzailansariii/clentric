import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

type BreadcrumbItemType = {
  label: string;
  href?: string; // omit on the current page — it shouldn't be a link
};

type PageHeaderProps = {
  title: string;
  description: string;
  actions?: React.ReactNode;
  breadcrumbs?: BreadcrumbItemType[];
};

export default function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="font-space text-xl font-medium md:text-2xl">
            {title}
          </h1>
          <p className="text-secondary-foreground/80 font-space text-sm font-normal md:text-lg">
            {description}
          </p>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((item, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return (
                <div
                  key={`${item.label}-${index}`}
                  className="flex items-center gap-0.5"
                >
                  <BreadcrumbItem>
                    {item.href && !isLast ? (
                      <BreadcrumbLink asChild>
                        <Link href={item.href}>{item.label}</Link>
                      </BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage>{item.label}</BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                  {!isLast && <BreadcrumbSeparator />}
                </div>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      )}
    </div>
  );
}
