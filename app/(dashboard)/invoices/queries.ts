import { unstable_rethrow } from "next/navigation";
import { requireUser } from "@/lib/current-user";
import { AppError, logError } from "@/lib/errors";

import { db } from "@/src/db";
import { clients } from "@/src/db/schema/clients";
import { invoices } from "@/src/db/schema/invoices";
import { and, asc, count, desc, eq, isNull, sql } from "drizzle-orm";
import { invoiceIdSchema, invoiceListParamsSchema } from "./schema";
import { invoiceState } from "./invoice-state";
import {
  invoiceItems,
  type InvoiceItemUnit,
} from "@/src/db/schema/invoice-items";
import { clientIdSchema } from "../clients/schema";
import {
  getDisplayStatus,
  InvoiceDisplayStatus,
} from "@/lib/get-invoice-display-status";
import {
  invoiceProjectBalance,
  type InvoiceProjectBalance,
} from "@/lib/project-ledger";
import { projects } from "@/src/db/schema/projects";
import { activityLog } from "@/src/db/schema/activity-logs";
import {
  issuerUserColumns,
  liveIssuer,
  livePayment,
  resolveIssuer,
  resolvePayment,
  visiblePaymentMethods,
  type IssuerDetails,
} from "@/lib/issuer-snapshot";
import type { PaymentDetails } from "@/lib/payment-methods";
import type { InvoiceTemplate } from "@/lib/invoice-templates";
import { logoSrc } from "@/lib/logo-url";
import { getPlanFeatures } from "@/lib/billing";

const daysUntilDue = sql<number>`(${invoices.dueDate} - current_date)`.mapWith(
  Number,
);

/** Paid invoices on the same project created before this one, before tax (the balance box). */
const paidBeforeOnProject = sql<string>`(
  select coalesce(sum(o.sub_total), 0)::text from invoices o
  where o.project_id = ${invoices.projectId}
    and o.user_id = ${invoices.userId}
    and o.id <> ${invoices.id}
    and o.deleted_at is null
    and o.status = 'paid'
    and o.created_at < ${invoices.createdAt}
)`;

export async function getInvoiceById(invoiceId: string) {
  try {
    const parsed = invoiceIdSchema.safeParse(invoiceId);
    // A malformed id can't match anything — same as any missing invoice.
    if (!parsed.success) return null;

    const user = await requireUser();

    // Started first so it runs alongside the invoice query.
    const features = getPlanFeatures(user.id);
    // One query: the ownership check on the invoice gates the line items and
    // the issuer, so they can't come back for an invoice this user doesn't own.
    const row = await db.query.invoices.findFirst({
      where: and(
        eq(invoices.userId, user.id),
        eq(invoices.id, parsed.data),
        isNull(invoices.deletedAt),
      ),
      extras: {
        daysUntilDue: daysUntilDue.as("days_until_due"),
        paidBeforeOnProject: paidBeforeOnProject.as("paid_before_on_project"),
      },
      with: {
        lineItems: { orderBy: [asc(invoiceItems.sortOrder)] },
        user: {
          columns: { ...issuerUserColumns, logoUrl: true },
          with: { paymentMethods: visiblePaymentMethods },
        },
      },
    });

    if (!row) return null;

    const { user: owner, ...invoice } = row;

    return {
      ...invoice,
      logoSrc:
        owner?.logoUrl && (await features).customBranding
          ? logoSrc(owner.logoUrl)
          : null,
      canDownloadPdf: (await features).pdfDownload,
      // Sent invoices print the details they went out with; drafts (and
      // invoices sent before snapshots existed) print the live ones.
      issuer: owner
        ? resolveIssuer(invoice.issuerSnapshot, liveIssuer(owner))
        : null,
      payment: resolvePayment(
        invoice.issuerSnapshot,
        invoice.paymentDetails,
        owner ? livePayment(owner) : { methods: [], instructions: null },
      ),
    };
  } catch (error) {
    unstable_rethrow(error);
    logError("getInvoiceById", error);
    if (error instanceof AppError) throw error;
    throw new AppError("FETCH_FAILED", "Could not load invoice.");
  }
}

export type InvoicePdfData = {
  invoice: {
    id: string;
    invoiceNumber: number;
    numberPrefix: string;
    notes: string | null;
    status: InvoiceDisplayStatus;
    issueDate: string;
    dueDate: string;
    paidAt: Date | null;
    subTotal: string;
    taxRate: string;
    taxAmount: string;
    total: string;
    currency: string;
    payment: PaymentDetails;
    clientName: string;
    clientEmail: string | null;
    clientCompany: string | null;
    clientCountry: string | null;
    projectTitle: string | null;
    /** Set only when the invoice opts in and its project has a fixed price. */
    projectBalance: InvoiceProjectBalance | null;
  };
  items: {
    id: string;
    description: string;
    quantity: string;
    rate: string;
    amount: string;
    unit: InvoiceItemUnit;
  }[];
  profile: IssuerDetails;
  template: InvoiceTemplate;
  logoUrl: string | null;
};

/** The signed-in user's invoice, ready for the PDF. */
export async function getInvoiceForPdf(
  invoiceId: string,
): Promise<InvoicePdfData | null> {
  try {
    const user = await requireUser();
    return await getInvoicePdfDataForOwner(invoiceId, user.id);
  } catch (error) {
    unstable_rethrow(error);
    logError("getInvoiceForPdf", error);
    if (error instanceof AppError) throw error;
    throw new AppError("FETCH_FAILED", "Could not load invoice.");
  }
}

export async function getInvoicePdfDataForOwner(
  invoiceId: string,
  ownerId: string,
): Promise<InvoicePdfData | null> {
  try {
    const parsed = invoiceIdSchema.safeParse(invoiceId);
    if (!parsed.success) return null;

    // Everything the PDF needs in a single round trip. The line items used to
    // be fetched in a second, sequential await after this lookup resolved.
    const row = await db.query.invoices.findFirst({
      where: and(
        eq(invoices.id, parsed.data),
        eq(invoices.userId, ownerId),
        isNull(invoices.deletedAt),
      ),
      columns: {
        id: true,
        invoiceNumber: true,
        numberPrefix: true,
        notes: true,
        status: true,
        issueDate: true,
        dueDate: true,
        paidAt: true,
        subTotal: true,
        taxRate: true,
        taxAmount: true,
        total: true,
        currency: true,
        paymentDetails: true,
        issuerSnapshot: true,
        showProjectBalance: true,
      },
      extras: {
        paidBeforeOnProject: paidBeforeOnProject.as("paid_before_on_project"),
      },
      with: {
        client: {
          columns: { name: true, email: true, company: true, country: true },
        },
        project: {
          columns: {
            title: true,
            deletedAt: true,
            pricing: true,
            budget: true,
          },
        },
        lineItems: {
          columns: {
            id: true,
            description: true,
            quantity: true,
            rate: true,
            amount: true,
            unit: true,
          },
          orderBy: [asc(invoiceItems.sortOrder), asc(invoiceItems.id)],
        },
        user: {
          columns: {
            ...issuerUserColumns,
            invoiceTemplate: true,
            logoUrl: true,
          },
          with: { paymentMethods: visiblePaymentMethods },
        },
      },
    });

    if (!row) return null;

    const {
      client,
      project,
      lineItems,
      user: owner,
      issuerSnapshot,
      paymentDetails,
      showProjectBalance,
      paidBeforeOnProject: paidBefore,
      ...invoice
    } = row;
    const liveProject = project && !project.deletedAt ? project : null;
    if (!owner) throw new AppError("NOT_FOUND", "Profile not found.");

    return {
      invoice: {
        ...invoice,
        payment: resolvePayment(
          issuerSnapshot,
          paymentDetails,
          livePayment(owner),
        ),
        status: getDisplayStatus(invoice),
        clientName: client.name,
        clientEmail: client.email,
        clientCompany: client.company,
        clientCountry: client.country,
        projectTitle: liveProject?.title ?? null,
        projectBalance:
          showProjectBalance && liveProject
            ? invoiceProjectBalance({
                pricing: liveProject.pricing,
                budget: liveProject.budget,
                paidBefore,
                thisInvoice: invoice.subTotal,
                taxRate: invoice.taxRate,
              })
            : null,
      },
      items: lineItems,
      profile: resolveIssuer(issuerSnapshot, liveIssuer(owner)),
      template: owner.invoiceTemplate,
      logoUrl: owner.logoUrl,
    };
  } catch (error) {
    unstable_rethrow(error);
    logError("getInvoicePdfDataForOwner", error);
    if (error instanceof AppError) throw error;
    throw new AppError("FETCH_FAILED", "Could not load invoice.");
  }
}

const money = (where: ReturnType<typeof sql>) =>
  sql<string>`coalesce(sum(${invoices.total}) filter (where ${where}), 0)::text`;
const tally = (where: ReturnType<typeof sql>) =>
  sql<number>`count(*) filter (where ${where})`.mapWith(Number);

/**
 * The invoices page: one page of rows for the chosen chip, plus chip counts
 * and the money strip (search applied, chip not). Two queries in parallel.
 */
export async function getInvoiceList(
  rawParams: unknown,
  scope: { clientId?: string } = {},
) {
  try {
    const user = await requireUser();
    const { page, pageSize, search, view } = invoiceListParamsSchema.parse(
      rawParams ?? {},
    );

    const base = [eq(invoices.userId, user.id), isNull(invoices.deletedAt)];
    if (scope.clientId) {
      const parsedClientId = clientIdSchema.safeParse(scope.clientId);
      if (!parsedClientId.success) {
        throw new AppError("VALIDATION_ERROR", "Invalid client ID.");
      }
      base.push(eq(invoices.clientId, parsedClientId.data));
    }
    if (search) {
      // Client, project, or invoice number - "INV-1042" matches on its digits.
      const pattern = `%${search}%`;
      const digits = search.replace(/\D/g, "");
      base.push(
        digits
          ? sql`(${clients.name} ilike ${pattern} or ${projects.title} ilike ${pattern} or ${invoices.invoiceNumber}::text like ${`%${digits}%`})`
          : sql`(${clients.name} ilike ${pattern} or ${projects.title} ilike ${pattern})`,
      );
    }

    // A claimed invoice waits on you, not the client, so it isn't "overdue".
    const views = {
      draft: sql`${invoices.status} = 'draft'`,
      open: sql`${invoices.status} = 'sent'`,
      overdue: sql`${invoices.status} = 'sent' and ${invoices.dueDate} < current_date and ${invoices.paymentClaimedAt} is null`,
      paid: sql`${invoices.status} = 'paid'`,
    };
    const claimed = sql`${invoices.status} = 'sent' and ${invoices.paymentClaimedAt} is not null`;
    const pending = sql`${invoices.status} = 'sent' and ${invoices.dueDate} >= current_date and ${invoices.paymentClaimedAt} is null`;
    // Groups in the order the list shows them: what needs you first.
    const groupRank = sql`case when ${views.overdue} then 0 when ${claimed} then 1 when ${views.draft} then 2 when ${pending} then 3 else 4 end`;
    const paidThisMonth = sql`${invoices.status} = 'paid' and ${invoices.paidAt} >= date_trunc('month', now())`;

    const [rows, [totals]] = await Promise.all([
      db
        .select({
          id: invoices.id,
          invoiceNumber: invoices.invoiceNumber,
          numberPrefix: invoices.numberPrefix,
          status: invoices.status,
          issueDate: invoices.issueDate,
          dueDate: invoices.dueDate,
          daysUntilDue,
          total: invoices.total,
          currency: invoices.currency,
          clientName: clients.name,
          projectTitle: projects.title,
          createdAt: invoices.createdAt,
          sentAt: invoices.sentAt,
          paidAt: invoices.paidAt,
          paymentClaimedAt: invoices.paymentClaimedAt,
          lastReminderSentAt: invoices.lastReminderSentAt,
          // Same rule sendInvoiceAction enforces.
          sendReady: sql<boolean>`(${invoices.total} > 0 and not exists (
            select 1 from invoice_items ii
            where ii.invoice_id = ${invoices.id} and btrim(ii.description) = ''
          ))`,
          clientEmail: clients.email,
          clientHasEmail: sql<boolean>`coalesce(${clients.email}, '') <> ''`,
          firstLine: sql<string | null>`(
            select ii.description from invoice_items ii
            where ii.invoice_id = ${invoices.id}
            order by ii.sort_order, ii.id limit 1
          )`,
        })
        .from(invoices)
        .innerJoin(clients, eq(invoices.clientId, clients.id))
        .leftJoin(projects, eq(invoices.projectId, projects.id))
        .where(and(...base, ...(view ? [views[view]] : [])))
        .orderBy(groupRank, desc(invoices.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      db
        .select({
          all: count(),
          draft: tally(views.draft),
          draftSum: money(views.draft),
          open: tally(views.open),
          openSum: money(views.open),
          overdue: tally(views.overdue),
          overdueSum: money(views.overdue),
          paid: tally(views.paid),
          paidMonth: tally(paidThisMonth),
          paidMonthSum: money(paidThisMonth),
          paidSum: money(views.paid),
          claimed: tally(claimed),
          claimedSum: money(claimed),
          pending: tally(pending),
          pendingSum: money(pending),
          billedSum: money(sql`${invoices.status} in ('sent', 'paid')`),
        })
        .from(invoices)
        .innerJoin(clients, eq(invoices.clientId, clients.id))
        .leftJoin(projects, eq(invoices.projectId, projects.id))
        .where(and(...base)),
    ]);

    const counts = {
      all: totals?.all ?? 0,
      draft: totals?.draft ?? 0,
      open: totals?.open ?? 0,
      overdue: totals?.overdue ?? 0,
      paid: totals?.paid ?? 0,
    };
    const total = view ? counts[view] : counts.all;

    return {
      invoices: rows.map((row) => {
        const status = getDisplayStatus(row);
        return { ...row, status, state: invoiceState({ ...row, status }) };
      }),
      counts,
      groups: [
        {
          key: "overdue",
          label: "Overdue",
          count: counts.overdue,
          sum: totals?.overdueSum ?? "0",
        },
        {
          key: "claimed",
          label: "Client says paid",
          count: totals?.claimed ?? 0,
          sum: totals?.claimedSum ?? "0",
        },
        {
          key: "draft",
          label: "Drafts",
          count: counts.draft,
          sum: totals?.draftSum ?? "0",
        },
        {
          key: "pending",
          label: "Pending",
          count: totals?.pending ?? 0,
          sum: totals?.pendingSum ?? "0",
        },
        {
          key: "paid",
          label: "Paid",
          count: counts.paid,
          sum: totals?.paidSum ?? "0",
        },
      ],
      strip: {
        open: { count: counts.open, sum: totals?.openSum ?? "0" },
        overdue: { count: counts.overdue, sum: totals?.overdueSum ?? "0" },
        paidMonth: {
          count: totals?.paidMonth ?? 0,
          sum: totals?.paidMonthSum ?? "0",
        },
        draft: { count: counts.draft, sum: totals?.draftSum ?? "0" },
        paid: totals?.paidSum ?? "0",
        billed: totals?.billedSum ?? "0",
      },
      view: view ?? null,
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  } catch (error) {
    unstable_rethrow(error);
    logError("getInvoiceList", error);
    if (error instanceof AppError) throw error;
    throw new AppError("FETCH_FAILED", "Could not load invoices.");
  }
}

export type InvoiceListRow = Awaited<
  ReturnType<typeof getInvoiceList>
>["invoices"][number];

/** When each reminder went out, oldest first (one activity row per reminder). */
export async function getInvoiceReminderDates(invoiceId: string) {
  try {
    const parsed = invoiceIdSchema.safeParse(invoiceId);
    if (!parsed.success) return [];

    const user = await requireUser();
    const rows = await db
      .select({ at: activityLog.createdAt })
      .from(activityLog)
      .where(
        and(
          eq(activityLog.userId, user.id),
          eq(activityLog.entityId, parsed.data),
          eq(activityLog.action, "invoice.reminder_sent"),
        ),
      )
      .orderBy(asc(activityLog.createdAt));

    return rows.map((row) => row.at);
  } catch (error) {
    unstable_rethrow(error);
    logError("getInvoiceReminderDates", error);
    return [];
  }
}
