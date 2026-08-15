"use client";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { StatusBadge } from "@/components/ui/status-badge";
import { CustomButton } from "@/components/ui/custom-button";
import { formatPhone } from "@/lib/format-phone";
import { formatDate, formatRelativeDate } from "@/lib/format-date";
import { clientStatusConfig } from "../client-status-config";
import type { ClientRow, ProjectRow } from "../client-columns";
import { PencilIcon, TrashIcon } from "lucide-react";
import { useState } from "react";
import { TabButton } from "@/components/ui/tab-button";
import { ProjectsPanel } from "./projects-panel";
import { InvoicesPanel } from "./invoices-panel";

export function ClientDetail({
  client,
  projects,
}: {
  client: ClientRow;
  projects: ProjectRow[];
}) {
  const [activeSection, setActiveSection] = useState<"projects" | "invoices">(
    "projects",
  );

  const config = clientStatusConfig[client.status];

  return (
    <div className="flex flex-col gap-5">
      <div className="border-border rounded-xl border">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <AvatarInitials
              name={client.name}
              variant="neutral"
              shape="square"
              size="lg"
            />
            <div>
              <h2 className="font-mono font-medium tracking-tight">
                {client.name}
              </h2>
              <div className="mt-0.5 flex items-center gap-2">
                <StatusBadge
                  status={config.variant}
                  className={config.dim ? "opacity-60" : undefined}
                >
                  {config.label}
                </StatusBadge>
                {client.company && (
                  <span className="text-muted-foreground text-sm">
                    {client.company}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <CustomButton
              variant="secondary"
              className="flex items-center gap-1.5"
            >
              <PencilIcon className="h-3.5 w-3.5" />
              Edit
            </CustomButton>
            <CustomButton
              variant="destructive"
              className="flex items-center gap-1.5"
            >
              <TrashIcon className="h-3.5 w-3.5" />
              Delete
            </CustomButton>
          </div>
        </div>

        <div className="border-border border-t" />

        {/* Fields */}
        <dl className="grid grid-cols-2 gap-6 px-6 py-5 sm:grid-cols-4">
          <Field
            label="Email"
            value={client.email}
            href={client.email ? `mailto:${client.email}` : undefined}
          />
          <Field
            label="Phone"
            value={client.phone ? formatPhone(client.phone) : null}
            href={client.phone ? `tel:${client.phone}` : undefined}
          />
          <Field label="Company" value={client.company} />
          <Field label="Country" value={client.country} />
        </dl>

        {(client.notes || true) && (
          <>
            <div className="border-border border-t" />
            <div className="px-6 py-5">
              <dt className="text-muted-foreground font-mono text-[10.5px] font-medium tracking-[0.06em] uppercase">
                Notes
              </dt>
              <dd className="mt-2 text-sm whitespace-pre-wrap">
                {client.notes || (
                  <span className="text-muted-foreground">No notes yet.</span>
                )}
              </dd>
            </div>
          </>
        )}

        <div className="border-border border-t" />

        {/* Footer */}
        <div className="text-muted-foreground flex items-center gap-3 px-6 py-3.5 text-xs">
          <span>Added {formatDate(client.createdAt)}</span>
          <span>·</span>
          <span>
            Last updated {formatRelativeDate(client.updatedAt)} (
            {formatDate(client.updatedAt)})
          </span>
        </div>
      </div>

      <div className="border-border rounded-xl border">
        <div
          role="tablist"
          aria-label="Client sections"
          className="border-border flex items-center gap-1 border-b px-6"
        >
          <TabButton
            id="project-tab"
            label="Projects"
            count={projects.length}
            isActive={activeSection === "projects"}
            onClick={() => setActiveSection("projects")}
          />
          <TabButton
            id="invoices-tab"
            label="Invoices"
            count={0}
            isActive={activeSection === "invoices"}
            onClick={() => setActiveSection("invoices")}
          />
        </div>
      </div>
      <div
        id="client-section-panel"
        role="tabpanel"
        aria-labelledby={
          activeSection === "projects" ? "project-tab" : "invoices-tab"
        }
      >
        {activeSection === "projects" ? (
          <ProjectsPanel projects={projects} />
        ) : (
          <InvoicesPanel />
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  href,
}: {
  label: string;
  value: string | null | undefined;
  href?: string;
}) {
  return (
    <div>
      <dt className="text-muted-foreground font-mono text-[10.5px] font-medium tracking-[0.06em] uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-sm">
        {!value ? (
          <span className="text-muted-foreground">—</span>
        ) : href ? (
          <a href={href} className="text-primary hover:underline">
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
