import Link from "next/link";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { FillBar } from "@/components/ui/fill-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/format-currency";
import type { ProjectBoardCard } from "./queries";

// A todo segment keeps a fill colour so it shows while emptying.
const SEGMENT = {
  done: "bg-primary",
  ready: "bg-success-600",
  todo: "bg-primary",
} as const;

/** "Oct 2" from a YYYY-MM-DD date, without a timezone shift. */
function shortDate(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function ProjectCard({ project }: { project: ProjectBoardCard }) {
  const { board } = project;
  const money = (n: number) => formatCurrency(String(n), project.currency);
  const href = `/projects/${project.id}`;
  const hasPrice = project.budget > 0;

  let invoiceHref: string | null = null;
  let invoiceLabel = "";
  if (board.ready) {
    const params = new URLSearchParams({
      clientId: project.clientId,
      projectId: project.id,
    });
    if (board.ready.kind === "stage") {
      params.set("milestoneId", board.ready.milestoneId);
      invoiceLabel = `Invoice stage ${board.ready.stage} · ${money(board.ready.amount)}`;
    } else {
      invoiceLabel = `Invoice the rest · ${money(board.ready.amount)}`;
    }
    invoiceHref = `/invoices/new?${params.toString()}`;
  }

  return (
    <article className="bg-card hover:border-foreground/15 relative flex flex-col gap-3.5 rounded-lg border p-4.5 shadow-xs transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[15.5px] font-semibold wrap-anywhere">
            {/* The title link covers the whole card; buttons sit above it. */}
            <Link
              href={href}
              className="hover:text-primary focus-visible:ring-ring rounded-sm after:absolute after:inset-0 after:rounded-lg focus-visible:ring-2 focus-visible:outline-none"
            >
              {project.title}
            </Link>
          </h2>
          <div className="mt-1.5 flex min-w-0 items-center gap-2">
            <AvatarInitials
              name={project.clientName ?? "?"}
              size="xs"
              shape="square"
              className="shrink-0"
            />
            <span className="text-muted-foreground truncate text-[13px]">
              {project.clientName ?? "No client"}
            </span>
          </div>
        </div>
        <StatusBadge status={board.tone} variant="soft" className="shrink-0">
          {board.label}
        </StatusBadge>
      </div>

      <div>
        <div className="mb-2 flex justify-between gap-3 text-[13px]">
          <span className="text-muted-foreground">Milestones</span>
          <span className="text-muted-foreground font-mono tabular-nums">
            {board.total ? `${board.done}/${board.total}` : "-"}
          </span>
        </div>
        {board.total > 0 ? (
          <div
            role="img"
            aria-label={`${board.done} of ${board.total} milestones complete`}
            className="flex gap-0.75"
          >
            {board.segments.map((state, i) => (
              <FillBar
                key={i}
                value={state === "todo" ? 0 : 1}
                fillClassName={SEGMENT[state]}
                delay={Math.min(i, 8) * 0.05}
                className="bg-foreground/10 h-1.5 flex-1 rounded-xs"
              />
            ))}
          </div>
        ) : (
          <div className="bg-foreground/10 h-1.5 rounded-xs" />
        )}
        <p className="mt-2.5 text-[13.5px] wrap-anywhere">
          {project.status === "completed" ? (
            <span className="text-muted-foreground">
              Delivered{" "}
              {shortDate(
                new Date(project.completedAt ?? project.updatedAt)
                  .toISOString()
                  .slice(0, 10),
              )}
            </span>
          ) : board.next ? (
            <>
              <span className="text-muted-foreground">Next:</span>{" "}
              {board.next.title}
              {board.next.dueDate && ` · ${shortDate(board.next.dueDate)}`}
            </>
          ) : (
            <span className="text-muted-foreground">
              {board.total ? "All milestones done" : "No milestones yet"}
            </span>
          )}
        </p>
      </div>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t pt-3">
        <div>
          <div className="text-muted-foreground text-[12.5px]">Invoiced</div>
          <div className="text-sm">
            <span className="font-mono font-medium tabular-nums">
              {money(project.billed)}
            </span>
            {hasPrice && (
              <span className="text-muted-foreground">
                {" "}
                of {project.pricing === "hourly" ? "~" : ""}
                {money(project.budget)}
              </span>
            )}
          </div>
        </div>
        {invoiceHref && (
          <Link
            href={invoiceHref}
            className="bg-primary-solid text-primary-solid-foreground focus-visible:ring-ring relative z-10 inline-flex h-8 items-center rounded-lg px-3 text-[13px] font-medium transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            {invoiceLabel}
          </Link>
        )}
      </div>
    </article>
  );
}
