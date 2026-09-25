import { unstable_rethrow } from "next/navigation";
import { and, asc, count, eq, gte, isNull, lt, sql } from "drizzle-orm";
import { requireUser } from "@/lib/current-user";
import { AppError, logError } from "@/lib/errors";
import { db } from "@/src/db";
import { users } from "@/src/db/schema/users";
import { userPaymentMethods } from "@/src/db/schema/payment-methods";
import { invoiceCounters } from "@/src/db/schema/invoice-counters";
import { clients } from "@/src/db/schema/clients";
import { proposals } from "@/src/db/schema/proposals";
import { projects } from "@/src/db/schema/projects";
import { invoices } from "@/src/db/schema/invoices";

export async function getProfileSettings() {
  try {
    const user = await requireUser();

    const [row] = await db
      .select({
        name: users.name,
        email: users.email,
        profession: users.profession,
      })
      .from(users)
      .where(and(eq(users.id, user.id), isNull(users.deletedAt)))
      .limit(1);

    if (!row) return null;

    return {
      ...row,
      // Verification lives on the auth user, not in the users table.
      emailVerified: Boolean(user.email_confirmed_at),
    };
  } catch (error) {
    unstable_rethrow(error);
    logError("getProfileSettings", error);
    if (error instanceof AppError) throw error;
    throw new AppError("FETCH_FAILED", "Could not load your profile.");
  }
}

export type ProfileSettings = NonNullable<
  Awaited<ReturnType<typeof getProfileSettings>>
>;

/**
 * The name a new document is sent from: the business name, else the
 * person's name, else the email — the same order formatIssuer's title uses.
 * Shown in the invoice builder's live preview.
 */
export async function getIssuerTitle(): Promise<string> {
  try {
    const user = await requireUser();

    const [row] = await db
      .select({
        name: users.name,
        email: users.email,
        businessName: users.businessName,
        businessEmail: users.businessEmail,
      })
      .from(users)
      .where(and(eq(users.id, user.id), isNull(users.deletedAt)))
      .limit(1);

    return (
      row?.businessName?.trim() ||
      row?.name?.trim() ||
      row?.businessEmail ||
      row?.email ||
      user.email ||
      "You"
    );
  } catch (error) {
    unstable_rethrow(error);
    logError("getIssuerTitle", error);
    if (error instanceof AppError) throw error;
    throw new AppError("FETCH_FAILED", "Could not load your business name.");
  }
}

export async function getBusinessSettings() {
  try {
    const user = await requireUser();

    const [row] = await db
      .select({
        businessName: users.businessName,
        businessEmail: users.businessEmail,
        website: users.website,
        taxId: users.taxId,
        address: users.address,
      })
      .from(users)
      .where(and(eq(users.id, user.id), isNull(users.deletedAt)))
      .limit(1);

    return row ?? null;
  } catch (error) {
    unstable_rethrow(error);
    logError("getBusinessSettings", error);
    if (error instanceof AppError) throw error;
    throw new AppError("FETCH_FAILED", "Could not load your business details.");
  }
}

export type BusinessSettings = NonNullable<
  Awaited<ReturnType<typeof getBusinessSettings>>
>;

export async function getPaymentSettings() {
  try {
    const user = await requireUser();

    const [methods, [owner]] = await Promise.all([
      db
        .select({
          type: userPaymentMethods.type,
          accountHolder: userPaymentMethods.accountHolder,
          bankName: userPaymentMethods.bankName,
          accountNumber: userPaymentMethods.accountNumber,
          routingCode: userPaymentMethods.routingCode,
          paypalEmail: userPaymentMethods.paypalEmail,
          wiseAccount: userPaymentMethods.wiseAccount,
          upiId: userPaymentMethods.upiId,
          showOnInvoices: userPaymentMethods.showOnInvoices,
        })
        .from(userPaymentMethods)
        .where(
          and(
            eq(userPaymentMethods.userId, user.id),
            isNull(userPaymentMethods.deletedAt),
          ),
        )
        .orderBy(asc(userPaymentMethods.type)),
      db
        // "Other payment instructions" live on the old free-text column.
        .select({ instructions: users.paymentDetails })
        .from(users)
        .where(and(eq(users.id, user.id), isNull(users.deletedAt)))
        .limit(1),
    ]);

    if (!owner) return null;

    return { methods, instructions: owner.instructions };
  } catch (error) {
    unstable_rethrow(error);
    logError("getPaymentSettings", error);
    if (error instanceof AppError) throw error;
    throw new AppError("FETCH_FAILED", "Could not load your payment methods.");
  }
}

export type PaymentSettings = NonNullable<
  Awaited<ReturnType<typeof getPaymentSettings>>
>;

/**
 * Invoice & proposal defaults, plus the last invoice number actually used
 * (0 before the first invoice). Read by the settings page and by the new
 * invoice / new proposal pages to prefill their forms.
 */
export async function getDocumentDefaults() {
  try {
    const user = await requireUser();

    const [[owner], [counter]] = await Promise.all([
      db
        .select({
          invoicePrefix: users.invoicePrefix,
          paymentTermsDays: users.paymentTermsDays,
          defaultTaxRate: users.defaultTaxRate,
          defaultInvoiceNotes: users.defaultInvoiceNotes,
          defaultProposalExpiryDays: users.defaultProposalExpiryDays,
          defaultDepositPercent: users.defaultDepositPercent,
        })
        .from(users)
        .where(and(eq(users.id, user.id), isNull(users.deletedAt)))
        .limit(1),
      db
        .select({ lastNumber: invoiceCounters.lastNumber })
        .from(invoiceCounters)
        .where(eq(invoiceCounters.userId, user.id))
        .limit(1),
    ]);

    if (!owner) return null;

    return { ...owner, lastInvoiceNumber: counter?.lastNumber ?? 0 };
  } catch (error) {
    unstable_rethrow(error);
    logError("getDocumentDefaults", error);
    if (error instanceof AppError) throw error;
    throw new AppError("FETCH_FAILED", "Could not load your defaults.");
  }
}

export type DocumentDefaults = NonNullable<
  Awaited<ReturnType<typeof getDocumentDefaults>>
>;

/**
 * Live usage for the Plan section: four counts, each scoped to the user and
 * skipping soft-deleted rows. "Invoices this month" counts invoices created
 * since the start of the current calendar month in UTC — Clentric has no
 * per-user timezone setting.
 */
export async function getPlanUsage() {
  try {
    const user = await requireUser();

    const monthStartUtc = sql`date_trunc('month', now(), 'UTC')`;

    const [clientRows, proposalRows, projectRows, invoiceRows, [owner]] =
      await Promise.all([
        db
          .select({ count: count() })
          .from(clients)
          .where(and(eq(clients.userId, user.id), isNull(clients.deletedAt))),
        db
          .select({ count: count() })
          .from(proposals)
          .where(
            and(eq(proposals.userId, user.id), isNull(proposals.deletedAt)),
          ),
        db
          .select({ count: count() })
          .from(projects)
          .where(and(eq(projects.userId, user.id), isNull(projects.deletedAt))),
        db
          .select({ count: count() })
          .from(invoices)
          .where(
            and(
              eq(invoices.userId, user.id),
              isNull(invoices.deletedAt),
              gte(invoices.createdAt, monthStartUtc),
              lt(
                invoices.createdAt,
                sql`${monthStartUtc} + interval '1 month'`,
              ),
            ),
          ),
        // Read now so this section can become the real billing view later;
        // the beta copy is shown whatever it says.
        db
          .select({ plan: users.plan })
          .from(users)
          .where(and(eq(users.id, user.id), isNull(users.deletedAt)))
          .limit(1),
      ]);

    if (!owner) return null;

    return {
      plan: owner.plan,
      // Drizzle returns an array even for COUNT(*): unwrap the one row.
      clients: clientRows[0]?.count ?? 0,
      proposals: proposalRows[0]?.count ?? 0,
      projects: projectRows[0]?.count ?? 0,
      invoicesThisMonth: invoiceRows[0]?.count ?? 0,
    };
  } catch (error) {
    unstable_rethrow(error);
    logError("getPlanUsage", error);
    if (error instanceof AppError) throw error;
    throw new AppError("FETCH_FAILED", "Could not load your plan usage.");
  }
}

export type PlanUsage = NonNullable<Awaited<ReturnType<typeof getPlanUsage>>>;
