import "server-only";
import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/src/db";
import { clients } from "@/src/db/schema/clients";
import { projects } from "@/src/db/schema/projects";
import { milestones } from "@/src/db/schema/milestones";
import { proposals } from "@/src/db/schema/proposals";
import { proposalMilestones } from "@/src/db/schema/proposal-milestones";
import { proposalItems } from "@/src/db/schema/proposal-items";
import { invoices } from "@/src/db/schema/invoices";
import { invoiceItems } from "@/src/db/schema/invoice-items";

/**
 * Everything a user owns, for "Export your data". Every read is scoped to
 * `userId` and skips soft-deleted rows; child rows (items, milestones) come
 * only through a live parent the user owns. Columns are listed explicitly:
 * internal fields (user ids, public proposal tokens, snapshots) stay out.
 *
 * Runs as eight independent reads in one Promise.all.
 */
export async function getAccountExport(userId: string) {
  const [
    clientRows,
    projectRows,
    projectMilestoneRows,
    proposalRows,
    proposalMilestoneRows,
    proposalItemRows,
    invoiceRows,
    invoiceItemRows,
  ] = await Promise.all([
    db
      .select({
        id: clients.id,
        name: clients.name,
        email: clients.email,
        phone: clients.phone,
        company: clients.company,
        country: clients.country,
        status: clients.status,
        hourlyRate: clients.hourlyRate,
        notes: clients.notes,
        createdAt: clients.createdAt,
      })
      .from(clients)
      .where(and(eq(clients.userId, userId), isNull(clients.deletedAt)))
      .orderBy(asc(clients.createdAt)),

    db
      .select({
        id: projects.id,
        clientId: projects.clientId,
        title: projects.title,
        description: projects.description,
        status: projects.status,
        budget: projects.budget,
        currency: projects.currency,
        hourlyRate: projects.hourlyRate,
        deadline: projects.deadline,
        createdAt: projects.createdAt,
      })
      .from(projects)
      .where(and(eq(projects.userId, userId), isNull(projects.deletedAt)))
      .orderBy(asc(projects.createdAt)),

    db
      .select({
        id: milestones.id,
        projectId: milestones.projectId,
        title: milestones.title,
        status: milestones.status,
        dueDate: milestones.dueDate,
        sortOrder: milestones.sortOrder,
      })
      .from(milestones)
      .innerJoin(projects, eq(milestones.projectId, projects.id))
      .where(and(eq(projects.userId, userId), isNull(projects.deletedAt)))
      .orderBy(asc(milestones.projectId), asc(milestones.sortOrder)),

    db
      .select({
        id: proposals.id,
        clientId: proposals.clientId,
        title: proposals.title,
        content: proposals.content,
        status: proposals.status,
        currency: proposals.currency,
        subtotal: proposals.subtotal,
        taxRate: proposals.taxRate,
        tax: proposals.tax,
        total: proposals.total,
        depositPercent: proposals.depositPercent,
        expiresAt: proposals.expiresAt,
        viewedAt: proposals.viewedAt,
        acceptedAt: proposals.acceptedAt,
        rejectedAt: proposals.rejectedAt,
        declineReason: proposals.declineReason,
        createdAt: proposals.createdAt,
      })
      .from(proposals)
      .where(and(eq(proposals.userId, userId), isNull(proposals.deletedAt)))
      .orderBy(asc(proposals.createdAt)),

    db
      .select({
        id: proposalMilestones.id,
        proposalId: proposalMilestones.proposalId,
        name: proposalMilestones.name,
        description: proposalMilestones.description,
        sortOrder: proposalMilestones.sortOrder,
      })
      .from(proposalMilestones)
      .innerJoin(proposals, eq(proposalMilestones.proposalId, proposals.id))
      .where(and(eq(proposals.userId, userId), isNull(proposals.deletedAt)))
      .orderBy(
        asc(proposalMilestones.proposalId),
        asc(proposalMilestones.sortOrder),
      ),

    db
      .select({
        id: proposalItems.id,
        proposalId: proposalItems.proposalId,
        milestoneId: proposalItems.milestoneId,
        description: proposalItems.description,
        quantity: proposalItems.quantity,
        rate: proposalItems.rate,
        amount: proposalItems.amount,
        sortOrder: proposalItems.sortOrder,
      })
      .from(proposalItems)
      .innerJoin(proposals, eq(proposalItems.proposalId, proposals.id))
      .where(and(eq(proposals.userId, userId), isNull(proposals.deletedAt)))
      .orderBy(asc(proposalItems.proposalId), asc(proposalItems.sortOrder)),

    db
      .select({
        id: invoices.id,
        numberPrefix: invoices.numberPrefix,
        invoiceNumber: invoices.invoiceNumber,
        clientId: invoices.clientId,
        projectId: invoices.projectId,
        status: invoices.status,
        currency: invoices.currency,
        issueDate: invoices.issueDate,
        dueDate: invoices.dueDate,
        subTotal: invoices.subTotal,
        taxRate: invoices.taxRate,
        taxAmount: invoices.taxAmount,
        total: invoices.total,
        notes: invoices.notes,
        sentAt: invoices.sentAt,
        paidAt: invoices.paidAt,
        createdAt: invoices.createdAt,
      })
      .from(invoices)
      .where(and(eq(invoices.userId, userId), isNull(invoices.deletedAt)))
      .orderBy(asc(invoices.invoiceNumber)),

    db
      .select({
        id: invoiceItems.id,
        invoiceId: invoiceItems.invoiceId,
        description: invoiceItems.description,
        quantity: invoiceItems.quantity,
        unit: invoiceItems.unit,
        rate: invoiceItems.rate,
        amount: invoiceItems.amount,
        sortOrder: invoiceItems.sortOrder,
      })
      .from(invoiceItems)
      .innerJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
      .where(and(eq(invoices.userId, userId), isNull(invoices.deletedAt)))
      .orderBy(asc(invoiceItems.invoiceId), asc(invoiceItems.sortOrder)),
  ]);

  return {
    clients: clientRows,
    projects: projectRows,
    projectMilestones: projectMilestoneRows,
    proposals: proposalRows,
    proposalMilestones: proposalMilestoneRows,
    proposalItems: proposalItemRows,
    invoices: invoiceRows,
    invoiceItems: invoiceItemRows,
  };
}

export type AccountExport = Awaited<ReturnType<typeof getAccountExport>>;

type Row = { id: string };

function groupBy<T>(rows: T[], key: (row: T) => string | null) {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const id = key(row);
    if (!id) continue;
    map.set(id, [...(map.get(id) ?? []), row]);
  }
  return map;
}

/** The JSON shape: one key per entity, children nested under parents. */
export function toJsonExport(data: AccountExport, exportedAt: Date) {
  const projectMilestones = groupBy(data.projectMilestones, (m) => m.projectId);
  const proposalMilestones = groupBy(
    data.proposalMilestones,
    (m) => m.proposalId,
  );
  const proposalItems = groupBy(data.proposalItems, (i) => i.proposalId);
  const invoiceItems = groupBy(data.invoiceItems, (i) => i.invoiceId);
  const childrenOf = <T>(map: Map<string, T[]>, parent: Row) =>
    map.get(parent.id) ?? [];

  return {
    exportedAt: exportedAt.toISOString(),
    clients: data.clients,
    projects: data.projects.map((project) => ({
      ...project,
      milestones: childrenOf(projectMilestones, project),
    })),
    proposals: data.proposals.map((proposal) => ({
      ...proposal,
      milestones: childrenOf(proposalMilestones, proposal),
      items: childrenOf(proposalItems, proposal),
    })),
    invoices: data.invoices.map((invoice) => ({
      ...invoice,
      items: childrenOf(invoiceItems, invoice),
    })),
  };
}
