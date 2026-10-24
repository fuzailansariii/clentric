"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";
import { AnimatePresence, MotionConfig, motion } from "motion/react";

import PageHeader from "@/components/dashboard/page-header";
import { FileText, PencilIcon, Receipt, Trash2Icon } from "lucide-react";
import { NewMenu } from "@/components/dashboard/new-menu";
import { DetailCard, DetailList } from "@/components/dashboard/detail-parts";
import {
  CardActions,
  HeaderActions,
  MoreMenu,
  type PageAction,
} from "@/components/dashboard/page-actions";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { DeleteDialog } from "@/components/delete-dialog";

import { customButtonClasses } from "@/components/ui/custom-button";
import { MetricStrip } from "@/components/ui/metric-strip";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { countryName } from "@/lib/countries";
import { formatCurrency } from "@/lib/format-currency";
import { formatDate } from "@/lib/format-date";
import { rise } from "@/lib/motion";
import { runActionWithToast } from "@/lib/run-action-with-toast";
import { cn } from "@/lib/utils";
import type { ClientRow } from "@/src/db/schema/clients";
import { deleteClientAction, updateClientAction } from "../actions";
import { clientStatusConfig, type ClientStatus } from "../client-status-config";

export type ClientTab = {
  key: "projects" | "proposals" | "invoices";
  mini: { label: string; value: string; danger?: boolean }[];
  chips: { value: string; label: string; count: number }[];
  allCount: number;
  rows: {
    id: string;
    href: string;
    title: string;
    sub: string;
    amount: string;
    tone: StatusTone;
    label: string;
  }[];
  page: { page: number; pageSize: number; total: number; totalPages: number };
  empty: { title: string; body: string; label: string; href: string };
};

type Summary = {
  owes: string;
  late: boolean;
  lifetime: string;
  sentInvoices: number;
  activeProjects: number;
  projects: number;
  proposals: number;
  invoices: number;
};

const STATUS = (Object.keys(clientStatusConfig) as ClientStatus[]).map(
  (value) => ({ value, label: clientStatusConfig[value].label }),
);

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function ClientDetail({
  client,
  summary,
  panel,
  search,
}: {
  client: ClientRow;
  summary: Summary;
  panel: ClientTab;
  search: string;
}) {
  const router = useRouter();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [status, setOptimisticStatus] = useOptimistic(client.status);
  const [, startStatus] = useTransition();

  const owes = Number(summary.owes);
  const config = clientStatusConfig[status];
  const company =
    client.company && client.company !== client.name ? client.company : null;

  const changeStatus = (next: ClientStatus) => {
    if (next === status) return;
    startStatus(async () => {
      setOptimisticStatus(next);
      const result = await updateClientAction(client.id, { status: next });
      if (result.success) {
        toast.success(
          `${client.name} is now ${clientStatusConfig[next].label.toLowerCase()}`,
        );
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  const tabs = [
    { key: "projects", label: "Projects", count: summary.projects },
    { key: "proposals", label: "Proposals", count: summary.proposals },
    { key: "invoices", label: "Invoices", count: summary.invoices },
  ] as const;
  const hasAny = panel.allCount > 0 || Boolean(search);
  const work = summary.projects + summary.invoices;

  // Header: managing the client. Side card: starting work for them.
  const cardActions: PageAction[] = [
    {
      label: "New proposal",
      kind: "primary",
      href: `/proposals/new?clientId=${client.id}`,
      icon: <FileText className="size-4" />,
    },
    {
      label: "New invoice",
      kind: "secondary",
      href: `/invoices/new?clientId=${client.id}`,
      icon: <Receipt className="size-4" />,
    },
  ];
  const headerActions: PageAction[] = [
    {
      label: "Edit client",
      kind: "quiet",
      href: `/clients/${client.id}/edit`,
      icon: <PencilIcon className="size-4" />,
    },
    {
      label: "Delete client",
      kind: "danger",
      onClick: () => setIsDeleteOpen(true),
      icon: <Trash2Icon className="size-4" />,
    },
  ];

  return (
    <>
      <PageHeader
        title={client.name}
        badge={
          <StatusBadge status={config.variant} variant="soft">
            {config.label}
          </StatusBadge>
        }
        subtitle={[company, client.email || "No email"]
          .filter(Boolean)
          .join(" · ")}
        backHref="/clients"
        actions={<HeaderActions actions={headerActions} />}
        mobileActions="inline"
        mobileMenu={
          <>
            <NewMenu
              items={[
                {
                  label: "New proposal",
                  href: `/proposals/new?clientId=${client.id}`,
                  icon: FileText,
                },
                {
                  label: "New invoice",
                  href: `/invoices/new?clientId=${client.id}`,
                  icon: Receipt,
                },
              ]}
            />
            <MoreMenu actions={headerActions} />
          </>
        }
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Clients", href: "/clients" },
          { label: client.name },
        ]}
      />

      <MotionConfig reducedMotion="user">
        <div className="@container px-2 py-5 sm:px-3 md:px-5 lg:px-10">
          <div className="flex flex-col gap-4">
            {/* Blocks rise in order: metrics, work panel, actions, side cards. */}
            <motion.div
              custom={0}
              variants={rise}
              initial="hidden"
              animate="show"
            >
              <MetricStrip
                columns={3}
                items={[
                  {
                    label: "Outstanding",
                    value: formatCurrency(summary.owes),
                    sub: summary.late
                      ? "Includes an overdue invoice"
                      : owes
                        ? "Not due yet"
                        : "All settled",
                    tone: summary.late ? "danger" : "default",
                  },
                  {
                    label: "Lifetime billed",
                    value: formatCurrency(summary.lifetime),
                    sub: `${plural(summary.sentInvoices, "invoice")} sent`,
                  },
                  {
                    label: "Active projects",
                    value: String(summary.activeProjects),
                    sub: `${summary.projects} in total`,
                  },
                ]}
              />
            </motion.div>

            <div className="grid items-start gap-5 @[1000px]:grid-cols-[minmax(0,1fr)_21.25rem]">
              {/* Tablet up: first on narrow, atop the right column when wide. Phones: "New" in the header. */}
              <motion.div
                custom={2}
                variants={rise}
                initial="hidden"
                animate="show"
                className="max-md:hidden @[1000px]:col-start-2 @[1000px]:row-start-1"
              >
                <DetailCard>
                  <CardActions actions={cardActions} />
                </DetailCard>
              </motion.div>

              <motion.section
                custom={1}
                variants={rise}
                initial="hidden"
                animate="show"
                className="bg-card @container min-w-0 overflow-hidden rounded-lg border shadow-xs @[1000px]:col-start-1 @[1000px]:row-span-2 @[1000px]:row-start-1"
              >
                <div
                  role="tablist"
                  aria-label="Client work"
                  className="flex scrollbar-none gap-0.5 overflow-x-auto overflow-y-hidden border-b px-2.5 [&::-webkit-scrollbar]:hidden"
                >
                  {tabs.map((tab) => {
                    const on = tab.key === panel.key;
                    return (
                      <Link
                        key={tab.key}
                        role="tab"
                        aria-selected={on}
                        href={`/clients/${client.id}?tab=${tab.key}`}
                        scroll={false}
                        className={cn(
                          "relative inline-flex h-11 items-center gap-1 px-2.5 text-[13.5px] font-medium whitespace-nowrap transition-colors",
                          on
                            ? "text-foreground"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {tab.label}
                        <span className="text-muted-foreground font-space text-xs tabular-nums">
                          {tab.count}
                        </span>
                        {/* Slides to the new tab instead of jumping. */}
                        {on && (
                          <motion.span
                            layoutId="client-tab-underline"
                            transition={{
                              type: "spring",
                              stiffness: 500,
                              damping: 40,
                            }}
                            className="bg-primary absolute inset-x-2.5 bottom-0 h-0.5"
                          />
                        )}
                      </Link>
                    );
                  })}
                </div>

                {hasAny ? (
                  <>
                    <motion.dl
                      key={panel.key}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2 }}
                      className="flex flex-wrap gap-x-6 gap-y-2 border-b px-4 py-3.5 sm:px-4.5"
                    >
                      {panel.mini.map((m) => (
                        <div key={m.label} className="flex flex-col gap-0.5">
                          <dt className="text-muted-foreground text-[12.5px]">
                            {m.label}
                          </dt>
                          <dd
                            className={cn(
                              "font-space text-sm font-medium tabular-nums",
                              m.danger && "text-danger-600",
                            )}
                          >
                            {m.value}
                          </dd>
                        </div>
                      ))}
                    </motion.dl>

                    <div className="px-4 py-3 sm:px-4.5">
                      <DataTableToolbar
                        searchPlaceholder="Search"
                        filters={[
                          {
                            key: "view",
                            label: `Filter ${panel.key}`,
                            allCount: panel.allCount,
                            options: panel.chips,
                          },
                        ]}
                      />
                    </div>

                    {panel.rows.length === 0 ? (
                      <p className="text-muted-foreground border-t px-4 py-4 text-[13.5px] sm:px-4.5">
                        Nothing matches this filter.
                      </p>
                    ) : (
                      <ul>
                        {panel.rows.map((row, index) => (
                          <motion.li
                            key={row.id}
                            custom={index}
                            variants={rise}
                            initial="hidden"
                            animate="show"
                            className="border-t"
                          >
                            <Link
                              href={row.href}
                              className="hover:bg-muted/50 focus-visible:ring-ring grid min-h-14 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 px-4 py-2.5 transition-colors focus-visible:ring-2 focus-visible:-outline-offset-2 focus-visible:outline-none sm:px-4.5 @[560px]:grid-cols-[minmax(0,1fr)_auto_8.5rem]"
                            >
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-medium">
                                  {row.title}
                                </span>
                                <span className="text-muted-foreground block truncate text-[12.5px]">
                                  {row.sub}
                                </span>
                              </span>
                              <span className="font-space text-right text-sm font-medium tabular-nums">
                                {row.amount}
                              </span>
                              <span className="col-start-1 @[560px]:col-start-auto @[560px]:justify-self-end">
                                <StatusBadge status={row.tone} variant="soft">
                                  {row.label}
                                </StatusBadge>
                              </span>
                            </Link>
                          </motion.li>
                        ))}
                      </ul>
                    )}

                    {panel.page.totalPages > 1 && (
                      <div className="border-t px-4 py-3 sm:px-4.5">
                        <DataTablePagination
                          page={panel.page.page}
                          pageSize={panel.page.pageSize}
                          total={panel.page.total}
                          totalPages={panel.page.totalPages}
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex max-w-120 flex-col items-start gap-2 px-4.5 py-7">
                    <p className="font-semibold">{panel.empty.title}</p>
                    <p className="text-muted-foreground text-[13.5px]">
                      {panel.empty.body}
                    </p>
                    <Link
                      href={panel.empty.href}
                      className={customButtonClasses("primary", "sm", "mt-1")}
                    >
                      {panel.empty.label}
                    </Link>
                  </div>
                )}
              </motion.section>

              <motion.aside
                custom={3}
                variants={rise}
                initial="hidden"
                animate="show"
                className="flex min-w-0 flex-col gap-4 @[1000px]:sticky @[1000px]:top-4 @[1000px]:col-start-2"
              >
                <DetailCard title="Status">
                  <SegmentedControl
                    label="Client status"
                    options={STATUS}
                    value={status}
                    onChange={changeStatus}
                    className="grid w-full grid-cols-2"
                    itemClassName="h-9 justify-center px-3 text-[13px]"
                  />
                </DetailCard>

                <DetailCard title="Details">
                  <DetailList
                    rows={[
                      {
                        label: "Email",
                        value: client.email ? (
                          <a
                            href={`mailto:${client.email}`}
                            className="text-primary hover:underline"
                          >
                            {client.email}
                          </a>
                        ) : (
                          "Not added"
                        ),
                      },
                      { label: "Phone", value: client.phone || "-" },
                      { label: "Company", value: client.company || "-" },
                      {
                        label: "Country",
                        value: countryName(client.country) ?? "-",
                      },
                      {
                        label: "Default hourly rate",
                        value: client.hourlyRate
                          ? `${formatCurrency(client.hourlyRate)}/hr`
                          : "-",
                      },
                      { label: "Added", value: formatDate(client.createdAt) },
                      { label: "Currency", value: "USD" },
                    ]}
                  />
                </DetailCard>

                <NotesCard clientId={client.id} initial={client.notes ?? ""} />
              </motion.aside>
            </div>
          </div>
        </div>
      </MotionConfig>

      <DeleteDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title={`Delete ${client.name}?`}
        description={
          work
            ? `They have ${plural(summary.projects, "project")} and ${plural(summary.invoices, "invoice")}. Finished work stays; open work has to be closed first.`
            : "This client is removed for good."
        }
        onDelete={async () => {
          await runActionWithToast(deleteClientAction(client.id), {
            loading: "Deleting client...",
            success: `${client.name} deleted`,
            onSuccess: () => router.push("/clients"),
            onError: (error) => {
              throw error;
            },
          });
        }}
      />
    </>
  );
}

/** Private notes that save a moment after you stop typing. */
function NotesCard({
  clientId,
  initial,
}: {
  clientId: string;
  initial: string;
}) {
  const [notes, setNotes] = useState(initial);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const saved = useRef(initial);

  useEffect(() => {
    if (notes === saved.current) return;
    const timer = setTimeout(async () => {
      setState("saving");
      const result = await updateClientAction(clientId, { notes });
      if (result.success) {
        saved.current = notes;
        setState("saved");
      } else {
        setState("idle");
        toast.error(result.error);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [notes, clientId]);

  return (
    <DetailCard
      title={<label htmlFor="client-notes">Notes</label>}
      aside={
        <span className="text-muted-foreground text-xs" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            {state !== "idle" && (
              <motion.span
                key={state}
                initial={{ opacity: 0, y: 2 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -2 }}
                transition={{ duration: 0.15 }}
                className="block"
              >
                {state === "saving" ? "Saving..." : "Saved"}
              </motion.span>
            )}
          </AnimatePresence>
        </span>
      }
    >
      <textarea
        id="client-notes"
        rows={4}
        value={notes}
        maxLength={2000}
        onChange={(event) => setNotes(event.target.value)}
        placeholder="Only you can see this."
        className="border-border bg-input/20 focus-visible:border-ring focus-visible:ring-ring/20 w-full rounded-lg border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
      />
    </DetailCard>
  );
}
