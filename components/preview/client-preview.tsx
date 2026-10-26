import { AvatarInitials } from "@/components/ui/avatar-initials";
import { StatusBadge } from "@/components/ui/status-badge";
import { clientStateConfig } from "@/app/(dashboard)/clients/client-state";
import { countryName } from "@/lib/countries";

const labelClass =
  "text-muted-foreground text-[10.5px] font-semibold tracking-[0.12em] uppercase";

/** How the client will read in your list and on what you send them. */
export default function ClientPreview({
  name,
  company,
  email,
  country,
  isNew,
  hourlyRate,
}: {
  name: string;
  company?: string;
  email?: string;
  country?: string;
  /** A client being created shows the "New" badge the list will give them. */
  isNew: boolean;
  hourlyRate?: string;
}) {
  const shown = name.trim() || "Client name";
  const config = clientStateConfig.new;
  const place = countryName(country);
  const rate = Number(hourlyRate);

  return (
    <section
      aria-label="Client preview"
      className="bg-card min-w-0 rounded-lg border p-4 shadow-xs sm:p-4.5"
    >
      <p className={labelClass}>In your clients</p>
      <div className="mt-2 flex min-w-0 items-center gap-2.5">
        <AvatarInitials
          name={shown}
          size="md"
          shape="square"
          className="shrink-0"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{shown}</p>
          <p className="text-muted-foreground truncate text-[12.5px]">
            {[company?.trim(), email?.trim() || "No email"]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        {isNew && (
          <StatusBadge status={config.tone} variant="soft">
            {config.label}
          </StatusBadge>
        )}
      </div>

      <div className="mt-4 border-t pt-3.5">
        <p className={labelClass}>Bill to, on invoices</p>
        <p className="mt-1 text-sm font-medium wrap-anywhere">{shown}</p>
        {company?.trim() && (
          <p className="text-[12.5px] wrap-anywhere">{company.trim()}</p>
        )}
        <p className="text-muted-foreground text-[12.5px] wrap-anywhere">
          {email?.trim() || "No email on file"}
        </p>
        {place && (
          <p className="text-muted-foreground text-[12.5px]">{place}</p>
        )}
      </div>

      <div className="mt-4 border-t pt-3.5">
        <p className={labelClass}>On proposals</p>
        <p className="mt-1 text-[13px]">Prepared for {shown}</p>
      </div>

      <p className="text-muted-foreground mt-4 border-t pt-3 text-[12px]">
        {email?.trim()
          ? "Proposals and invoices can be emailed to this client."
          : "Add an email to send proposals and invoices from Clentric."}
        {rate > 0 && ` Hour lines start at $${rate}/hr.`}
      </p>
    </section>
  );
}
