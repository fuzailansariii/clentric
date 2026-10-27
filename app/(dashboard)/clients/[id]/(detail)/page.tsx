import { notFound, redirect } from "next/navigation";
import { getClientById, getClientSummary } from "../../queries";
import { clientIdSchema } from "../../schema";
import { ClientDetail, type ClientTab } from "../client-details";
import { getProjectBoard } from "../../../projects/queries";
import { getInvoiceList } from "../../../invoices/queries";
import { getProposalList } from "../../../proposals/queries";
import { formatCurrency } from "@/lib/format-currency";
import { formatDayValue, formatShortDate } from "@/lib/format-due";
import { formatInvoiceNumber } from "@/lib/format-invoice-number";
import {
  invoiceNote,
  invoiceStateConfig,
} from "../../../invoices/invoice-state";
import {
  proposalActivity,
  proposalStateConfig,
} from "../../../proposals/proposal-state";

type ClientPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const TABS = ["projects", "proposals", "invoices"] as const;

export default async function ClientPage({
  params,
  searchParams,
}: ClientPageProps) {
  const { id } = await params;
  const query = await searchParams;

  if (!clientIdSchema.safeParse(id).success) notFound();
  if (query.edit === "true") redirect(`/clients/${id}/edit`);

  const tab = TABS.find((t) => t === query.tab) ?? "projects";
  const listParams = { ...query, pageSize: "10" };
  const scope = { clientId: id };

  const [client, summary, projectList, proposalList, invoiceList] =
    await Promise.all([
      getClientById(id),
      getClientSummary(id),
      tab === "projects" ? getProjectBoard(listParams, scope) : null,
      tab === "proposals" ? getProposalList(listParams, scope) : null,
      tab === "invoices" ? getInvoiceList(listParams, scope) : null,
    ]);

  if (!client || !summary) notFound();

  const money = (value: string | number) => formatCurrency(String(value));
  const search = typeof query.search === "string" ? query.search : "";
  let panel: ClientTab;

  if (projectList) {
    panel = {
      key: "projects",
      mini: [
        { label: "Total budget", value: money(projectList.sums.budget) },
        { label: "Invoiced", value: money(projectList.sums.billed) },
      ],
      chips: [
        {
          value: "active",
          label: "Active",
          count: projectList.tabCounts.active,
        },
        {
          value: "completed",
          label: "Completed",
          count: projectList.tabCounts.completed,
        },
      ],
      allCount: projectList.tabCounts.all,
      rows: projectList.cards.map((p) => {
        const { board } = p;
        const sub =
          p.status === "completed"
            ? `Delivered ${formatShortDate(p.completedAt ?? p.updatedAt)}`
            : board.next
              ? `Next: ${board.next.title}${board.next.dueDate ? ` · ${formatDayValue(board.next.dueDate)}` : ""}`
              : board.total
                ? "All milestones done"
                : "No milestones yet";
        return {
          id: p.id,
          href: `/projects/${p.id}`,
          title: p.title,
          sub,
          amount: money(p.budget > 0 ? p.budget : p.billed),
          tone: board.tone,
          label: board.label,
        };
      }),
      page: projectList,
      empty: {
        title: "No projects yet",
        body: `Start one for ${client.name}, or send a proposal they can accept.`,
        label: "New project",
        href: `/projects/new?clientId=${id}`,
      },
    };
  } else if (proposalList) {
    panel = {
      key: "proposals",
      mini: [
        { label: "Proposed", value: money(proposalList.strip.proposed) },
        { label: "Accepted", value: money(proposalList.strip.accepted) },
        { label: "Awaiting", value: money(proposalList.strip.awaiting.sum) },
      ],
      chips: [
        {
          value: "awaiting",
          label: "Awaiting",
          count: proposalList.counts.awaiting,
        },
        {
          value: "accepted",
          label: "Accepted",
          count: proposalList.counts.accepted,
        },
        { value: "closed", label: "Closed", count: proposalList.counts.closed },
        { value: "draft", label: "Drafts", count: proposalList.counts.draft },
      ],
      allCount: proposalList.counts.all,
      rows: proposalList.proposals.map((p) => ({
        id: p.id,
        href: `/proposals/${p.id}`,
        title: p.title,
        sub: proposalActivity(p.state, p),
        amount: money(p.total),
        tone: proposalStateConfig[p.state].tone,
        label: proposalStateConfig[p.state].label,
      })),
      page: proposalList,
      empty: {
        title: "No proposals yet",
        body: `Scope the work and send ${client.name} a link to accept.`,
        label: "New proposal",
        href: `/proposals/new?clientId=${id}`,
      },
    };
  } else {
    const list = invoiceList!;
    panel = {
      key: "invoices",
      mini: [
        { label: "Billed", value: money(list.strip.billed) },
        { label: "Paid", value: money(list.strip.paid) },
        { label: "Outstanding", value: money(list.strip.open.sum) },
        {
          label: "Overdue",
          value: money(list.strip.overdue.sum),
          danger: list.strip.overdue.count > 0,
        },
      ],
      chips: [
        { value: "open", label: "Outstanding", count: list.counts.open },
        { value: "overdue", label: "Overdue", count: list.counts.overdue },
        { value: "paid", label: "Paid", count: list.counts.paid },
        { value: "draft", label: "Drafts", count: list.counts.draft },
      ],
      allCount: list.counts.all,
      rows: list.invoices.map((i) => ({
        id: i.id,
        href: `/invoices/${i.id}`,
        title: formatInvoiceNumber(i.invoiceNumber, i.numberPrefix),
        sub: [i.firstLine, invoiceNote(i.state, i)].filter(Boolean).join(" · "),
        amount: money(i.total),
        tone: invoiceStateConfig[i.state].tone,
        label: invoiceStateConfig[i.state].label,
      })),
      page: list,
      empty: {
        title: "No invoices yet",
        body: `Bill ${client.name} for a milestone or a quick one-off.`,
        label: "New invoice",
        href: `/invoices/new?clientId=${id}`,
      },
    };
  }

  return (
    <ClientDetail
      client={client}
      summary={summary}
      panel={panel}
      search={search}
    />
  );
}
