// Accounts are kept apart only by the userId filter in each query and action.
// Seeds live in one uncommitted transaction; each test runs in a savepoint.
import { randomBytes } from "node:crypto";
import type { ReactElement } from "react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq, sql } from "drizzle-orm";
import { TransactionRollbackError } from "drizzle-orm/errors";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const live = vi.hoisted(() => {
  // Before any app module reads them: no Upstash, no Resend, no Sentry, and
  // billing off so plan limits can't be the reason a write is refused.
  for (const name of [
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN",
    "RESEND_API_KEY",
    "NEXT_PUBLIC_SENTRY_DSN",
    "BILLING_ENFORCED",
  ]) {
    process.env[name] = "";
  }
  try {
    process.loadEnvFile(".env");
  } catch (error) {
    // CI has no .env; it passes the same values as environment variables.
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  return {
    tx: null as object | null,
    user: null as { id: string; email: string } | null,
  };
});

// Every app query runs on the test's savepoint, never on a real connection.
vi.mock("@/src/db", () => ({
  db: new Proxy(
    {},
    {
      get(_target, prop) {
        if (!live.tx) throw new Error("No test transaction is open.");
        const value: unknown = Reflect.get(live.tx, prop);
        return typeof value === "function" ? value.bind(live.tx) : value;
      },
    },
  ),
}));

// The one seam requireUser() resolves the user through.
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: live.user }, error: null }),
    },
  }),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined, getAll: () => [], set: () => {} }),
}));
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: vi.fn(),
}));
vi.mock("@/lib/email/send-email", () => ({
  sendEmail: vi.fn(async () => ({ status: "skipped" })),
}));

import * as schema from "@/src/db/schema/schema";
import {
  clients,
  invoiceItems,
  invoices,
  milestones,
  projects,
  proposalItems,
  proposalMilestones,
  proposals,
  users,
} from "@/src/db/schema/schema";
import { sendEmail } from "@/lib/email/send-email";
import { adminClient, ensureTestUser } from "@/e2e/support/env";

import * as clientActions from "@/app/(dashboard)/clients/actions";
import * as clientQueries from "@/app/(dashboard)/clients/queries";
import * as projectActions from "@/app/(dashboard)/projects/actions";
import * as milestoneActions from "@/app/(dashboard)/projects/milestone-actions";
import * as projectQueries from "@/app/(dashboard)/projects/queries";
import * as invoiceActions from "@/app/(dashboard)/invoices/actions";
import * as invoiceQueries from "@/app/(dashboard)/invoices/queries";
import * as proposalActions from "@/app/(dashboard)/proposals/actions";
import * as publicActions from "@/app/(dashboard)/proposals/public-actions";
import * as proposalQueries from "@/app/(dashboard)/proposals/queries";
import * as dashboardQueries from "@/app/(dashboard)/dashboard/queries";
import * as attentionQueries from "@/app/(dashboard)/dashboard/attention-queries";
import * as moneyQueries from "@/app/(dashboard)/dashboard/money-queries";
import * as layoutQueries from "@/app/(dashboard)/queries";
import * as settingsActions from "@/app/(dashboard)/settings/actions";
import * as billingActions from "@/app/(dashboard)/settings/billing-actions";
import * as settingsQueries from "@/app/(dashboard)/settings/queries";
import * as accountActions from "@/app/(dashboard)/account-actions";
import { GET as invoicePdf } from "@/app/api/invoices/[id]/pdf/route";
import { GET as accountExport } from "@/app/api/account/export/route";
import PublicProposalPage from "@/app/p/[token]/page";
import { PublicProposalView } from "@/app/p/[token]/public-proposal-view";
import { ProposalUnavailable } from "@/app/p/[token]/proposal-unavailable";

const { updateClientAction, deleteClientAction } = clientActions;
const { getClientList, getClientById, getClientOptions, getClientSummary } =
  clientQueries;
const { createProjectAction, updateProjectAction, deleteProjectAction } =
  projectActions;
const {
  createMilestoneAction,
  updateMilestoneAction,
  setMilestoneStatusAction,
  deleteMilestoneAction,
} = milestoneActions;
const {
  getProjectById,
  getProjectOptionsByUserId,
  getMilestonesByProjectId,
  getInvoicesForProject,
  getProposalForProject,
  getProjectBoard,
  getMilestoneForInvoice,
  getClientProjectOptions,
} = projectQueries;
const {
  createInvoiceAction,
  updateInvoiceAction,
  updateInvoiceStatusAction,
  sendInvoiceAction,
  sendReminderAction,
  markInvoicePaidAction,
  deleteInvoiceAction,
  clearPaymentClaimAction,
  linkInvoiceProjectAction,
} = invoiceActions;
const {
  getInvoiceById,
  getInvoiceForPdf,
  getInvoicePdfDataForOwner,
  getInvoiceList,
  getInvoiceReminderDates,
} = invoiceQueries;
const {
  getProposalByToken,
  createProposalAction,
  sendProposalAction,
  emailProposalAction,
  revokeProposalAction,
  duplicateProposalAction,
  createProjectFromProposalAction,
  updateProposalAction,
  deleteProposalAction,
} = proposalActions;
const { viewProposalAction, respondProposalAction, markPaymentSentAction } =
  publicActions;
const { getProposalById, getProjectForProposal, getProposalList } =
  proposalQueries;

const realDb = drizzle({
  client: postgres(process.env.DATABASE_URL ?? "", { prepare: false, max: 1 }),
  schema,
});
type Tx = Parameters<Parameters<typeof realDb.transaction>[0]>[0];
type Start = <T>(fn: (tx: Tx) => Promise<T>) => Promise<T>;
type Held = { tx: Tx; release: () => Promise<void> };

/** Opens a transaction (or savepoint) and keeps it open until release(), which rolls it back. */
function hold(start: Start): Promise<Held> {
  return new Promise((resolve, reject) => {
    let finish!: () => void;
    const finished = new Promise<void>((r) => (finish = r));
    const done: Promise<void> = start(async (tx) => {
      resolve({
        tx,
        release: async () => {
          finish();
          await done;
        },
      });
      await finished;
      tx.rollback();
    }).catch((error: unknown) => {
      if (!(error instanceof TransactionRollbackError)) reject(error);
    });
  });
}

/** In every text field and amount B owns, so any leak is easy to spot. */
const MARK = "ZZB-LEAK";
const B_TOTAL = "7777.77";

const today = new Date().toISOString().slice(0, 10);
const inDays = (days: number) =>
  new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
const token = () => randomBytes(32).toString("base64url");

type Person = { id: string; email: string };
const USER_A: Person = { id: "", email: "isolation-a@clentric.test" };
const USER_B: Person = { id: "", email: "isolation-b@clentric.test" };

const ids = {
  clientA: "",
  projectA: "",
  invoiceA: "",
  proposalA: "",
  clientB: "",
  clientB2: "",
  projectB: "",
  milestoneB: "",
  proposalB: "",
  proposalBDraft: "",
  proposalBAccepted: "",
  invoiceB: "",
  invoiceBPaid: "",
  tokenB: "",
};

let suite: Held;
let current: Held | null = null;

const signIn = (person: Person) => {
  live.user = { id: person.id, email: person.email };
};
const signOut = () => {
  live.user = null;
};
const db = (): Tx => {
  if (!current) throw new Error("No test transaction is open.");
  return current.tx;
};

async function seed(tx: Tx) {
  await tx
    .update(users)
    .set({ businessName: `${MARK} studio` })
    .where(eq(users.id, USER_B.id));

  const [clientA] = await tx
    .insert(clients)
    .values({ userId: USER_A.id, name: "IsoA client" })
    .returning();
  const [projectA] = await tx
    .insert(projects)
    .values({ userId: USER_A.id, clientId: clientA.id, title: "IsoA project", budget: "100.00" })
    .returning();
  const [invoiceA] = await tx
    .insert(invoices)
    .values({
      userId: USER_A.id,
      clientId: clientA.id,
      invoiceNumber: 9001,
      subTotal: "50.00",
      total: "50.00",
      issueDate: today,
      dueDate: inDays(14),
    })
    .returning();
  await tx.insert(invoiceItems).values({
    invoiceId: invoiceA.id,
    description: "IsoA work",
    quantity: "1",
    rate: "50.00",
    amount: "50.00",
  });
  const [proposalA] = await tx
    .insert(proposals)
    .values({ userId: USER_A.id, clientId: clientA.id, title: "IsoA proposal", token: token() })
    .returning();

  const [clientB, clientB2] = await tx
    .insert(clients)
    .values([
      {
        userId: USER_B.id,
        name: `${MARK} client`,
        company: `${MARK} co`,
        email: "isolation-b-client@clentric.test",
      },
      { userId: USER_B.id, name: `${MARK} spare client` },
    ])
    .returning();

  const proposalRows = await tx
    .insert(proposals)
    .values([
      {
        userId: USER_B.id,
        clientId: clientB.id,
        title: `${MARK} proposal`,
        content: `${MARK} scope`,
        status: "sent" as const,
        token: token(),
        subtotal: B_TOTAL,
        total: B_TOTAL,
        expiresAt: new Date(Date.now() + 14 * 86_400_000),
      },
      {
        userId: USER_B.id,
        clientId: clientB.id,
        title: `${MARK} draft proposal`,
        token: token(),
        expiresAt: new Date(Date.now() + 14 * 86_400_000),
      },
      {
        userId: USER_B.id,
        clientId: clientB.id,
        title: `${MARK} accepted proposal`,
        status: "accepted" as const,
        acceptedAt: new Date(),
        token: token(),
        subtotal: B_TOTAL,
        total: B_TOTAL,
      },
    ])
    .returning();
  const [proposalB, proposalBDraft, proposalBAccepted] = proposalRows;
  for (const proposal of proposalRows) {
    const [stage] = await tx
      .insert(proposalMilestones)
      .values({ proposalId: proposal.id, name: `${MARK} phase` })
      .returning();
    await tx.insert(proposalItems).values({
      proposalId: proposal.id,
      milestoneId: stage.id,
      description: `${MARK} line`,
      rate: B_TOTAL,
      amount: B_TOTAL,
    });
  }

  const [projectB] = await tx
    .insert(projects)
    .values({
      userId: USER_B.id,
      clientId: clientB.id,
      proposalId: proposalB.id,
      title: `${MARK} project`,
      description: `${MARK} brief`,
      budget: B_TOTAL,
      status: "in_progress",
    })
    .returning();
  const [milestoneB] = await tx
    .insert(milestones)
    .values({ projectId: projectB.id, title: `${MARK} stage`, amount: "4444.44" })
    .returning();

  const [invoiceB, invoiceBPaid] = await tx
    .insert(invoices)
    .values([
      {
        userId: USER_B.id,
        clientId: clientB.id,
        projectId: projectB.id,
        invoiceNumber: 9001,
        notes: `${MARK} notes`,
        subTotal: B_TOTAL,
        total: B_TOTAL,
        issueDate: today,
        dueDate: inDays(14),
        status: "sent" as const,
        sentAt: new Date(),
      },
      {
        userId: USER_B.id,
        clientId: clientB.id,
        invoiceNumber: 9002,
        subTotal: B_TOTAL,
        total: B_TOTAL,
        issueDate: today,
        dueDate: inDays(14),
        status: "paid" as const,
        sentAt: new Date(),
        paidAt: new Date(),
      },
    ])
    .returning();
  await tx.insert(invoiceItems).values([
    {
      invoiceId: invoiceB.id,
      description: `${MARK} item one`,
      quantity: "1",
      rate: "3333.33",
      amount: "3333.33",
      sortOrder: 0,
    },
    {
      invoiceId: invoiceB.id,
      milestoneId: milestoneB.id,
      description: `${MARK} item two`,
      quantity: "1",
      rate: "4444.44",
      amount: "4444.44",
      sortOrder: 1,
    },
    {
      invoiceId: invoiceBPaid.id,
      description: `${MARK} paid item`,
      quantity: "1",
      rate: B_TOTAL,
      amount: B_TOTAL,
    },
  ]);

  Object.assign(ids, {
    clientA: clientA.id,
    projectA: projectA.id,
    invoiceA: invoiceA.id,
    proposalA: proposalA.id,
    clientB: clientB.id,
    clientB2: clientB2.id,
    projectB: projectB.id,
    milestoneB: milestoneB.id,
    proposalB: proposalB.id,
    proposalBDraft: proposalBDraft.id,
    proposalBAccepted: proposalBAccepted.id,
    invoiceB: invoiceB.id,
    invoiceBPaid: invoiceBPaid.id,
    tokenB: proposalB.token,
  });
}

/** All B's rows plus anything attached to them, in one round trip. */
async function snapshotB(): Promise<unknown> {
  const b = USER_B.id;
  const [row] = await db().execute<{ snap: unknown }>(sql`
    with
      bc as (select id from clients where user_id = ${b}),
      bp as (select id from projects where user_id = ${b}),
      bi as (select id from invoices where user_id = ${b}),
      bpr as (select id from proposals where user_id = ${b}),
      bm as (select id from milestones where project_id in (select id from bp))
    select json_build_object(
      'user', (select to_jsonb(t) from users t where t.id = ${b}),
      'clients', (select json_agg(t order by t.id) from clients t where t.user_id = ${b}),
      'projects', (select json_agg(t order by t.id) from projects t
        where t.user_id = ${b} or t.client_id in (select id from bc)),
      'milestones', (select json_agg(t order by t.id) from milestones t
        where t.project_id in (select id from bp)),
      'proposals', (select json_agg(t order by t.id) from proposals t
        where t.user_id = ${b} or t.client_id in (select id from bc)),
      'proposalMilestones', (select json_agg(t order by t.id) from proposal_milestones t
        where t.proposal_id in (select id from bpr)),
      'proposalItems', (select json_agg(t order by t.id) from proposal_items t
        where t.proposal_id in (select id from bpr)),
      'invoices', (select json_agg(t order by t.id) from invoices t
        where t.user_id = ${b} or t.client_id in (select id from bc)
          or t.project_id in (select id from bp)),
      'invoiceItems', (select json_agg(t order by t.id) from invoice_items t
        where t.invoice_id in (select id from bi) or t.milestone_id in (select id from bm))
    ) as snap`);
  return row?.snap;
}

/** Removes all of B's records inside the current savepoint, in one round trip. */
async function wipeB() {
  const b = USER_B.id;
  if (!/^[0-9a-f-]{36}$/.test(b)) throw new Error("USER_B has no id.");
  await db().execute(
    sql.raw(`do $$
      declare b uuid := '${b}';
      begin
        update proposals set deposit_invoice_id = null where user_id = b;
        delete from invoice_items where invoice_id in (select id from invoices where user_id = b);
        delete from invoices where user_id = b;
        delete from milestones where project_id in (select id from projects where user_id = b);
        delete from projects where user_id = b;
        delete from proposal_items where proposal_id in (select id from proposals where user_id = b);
        delete from proposal_milestones where proposal_id in (select id from proposals where user_id = b);
        delete from proposals where user_id = b;
        delete from clients where user_id = b;
      end $$`),
  );
}

/** The B values found in a result: ids, the token, the marker text and the total. */
function leaksOfB(value: unknown): string[] {
  const text = JSON.stringify(value) ?? "";
  const needles = [
    MARK,
    B_TOTAL,
    USER_B.id,
    ids.clientB,
    ids.clientB2,
    ids.projectB,
    ids.milestoneB,
    ids.proposalB,
    ids.proposalBDraft,
    ids.proposalBAccepted,
    ids.invoiceB,
    ids.invoiceBPaid,
    ids.tokenB,
  ];
  return needles.filter((needle) => needle && text.includes(needle));
}

async function settle<T>(run: () => Promise<T>): Promise<{ value: T } | { error: unknown }> {
  try {
    return { value: await run() };
  } catch (error) {
    return { error };
  }
}

const isEmpty = (value: unknown) =>
  value === null || value === undefined || (Array.isArray(value) && value.length === 0);

type Result = { success: boolean };
type WriteCase = {
  name: string;
  run: () => Promise<Result>;
  /** What B runs to prove the call can succeed; false when there is no fair equivalent. */
  control?: (() => Promise<Result>) | false;
  /** Allowed to report success (it acts on A's own record) as long as B is untouched. */
  mayReportSuccess?: true;
};

const projectInput = (clientId: string) => ({
  title: "Iso project",
  clientId,
  pricing: "fixed",
  budget: "100",
  status: "not_started",
});
const invoiceInput = (fields: Record<string, unknown>) => ({
  issueDate: today,
  dueDate: inDays(14),
  currency: "USD",
  taxRate: 0,
  lineItems: [{ description: "Iso work", quantity: 1, rate: 100, unit: "item" }],
  ...fields,
});
const proposalInput = (clientId: string) => ({
  clientId,
  title: "Iso proposal",
  currency: "USD",
  taxRate: 0,
  depositPercent: 0,
  deliveryDays: 0,
  expiresInDays: 14,
  milestones: [{ name: "Stage", items: [{ description: "Iso work", quantity: 1, rate: 100 }] }],
});

/** Updates, deletes, sends, mark-paid and accepts aimed at B's own records. */
const writeCases: WriteCase[] = [
  { name: "client: updateClientAction", run: () => updateClientAction(ids.clientB, { name: "hijacked" }) },
  { name: "client: deleteClientAction", run: () => deleteClientAction(ids.clientB2) },
  { name: "project: updateProjectAction", run: () => updateProjectAction(ids.projectB, { title: "hijacked" }) },
  { name: "project: deleteProjectAction", run: () => deleteProjectAction(ids.projectB) },
  { name: "milestone: updateMilestoneAction", run: () => updateMilestoneAction(ids.milestoneB, { title: "hijacked" }) },
  { name: "milestone: setMilestoneStatusAction", run: () => setMilestoneStatusAction(ids.milestoneB, "completed") },
  { name: "milestone: deleteMilestoneAction", run: () => deleteMilestoneAction(ids.milestoneB) },
  { name: "proposal: sendProposalAction", run: () => sendProposalAction({ proposalId: ids.proposalBDraft }) },
  { name: "proposal: emailProposalAction", run: () => emailProposalAction({ proposalId: ids.proposalB }) },
  { name: "proposal: revokeProposalAction", run: () => revokeProposalAction({ proposalId: ids.proposalB }) },
  { name: "proposal: duplicateProposalAction", run: () => duplicateProposalAction({ proposalId: ids.proposalB }) },
  {
    name: "proposal: createProjectFromProposalAction (start the accepted one)",
    run: () => createProjectFromProposalAction({ proposalId: ids.proposalBAccepted }),
  },
  {
    name: "proposal: updateProposalAction",
    run: () => updateProposalAction({ ...proposalInput(ids.clientB), proposalId: ids.proposalBDraft }),
  },
  { name: "proposal: deleteProposalAction", run: () => deleteProposalAction({ proposalId: ids.proposalB }) },
  {
    name: "proposal: respondProposalAction (accept) with B's proposal id as the token",
    run: () => respondProposalAction({ token: ids.proposalB, response: "accepted" }),
    // Declined: the seed already links projectB to this proposal, so accepting would refuse a second project.
    control: () => respondProposalAction({ token: ids.tokenB, response: "declined" }),
  },
  {
    name: "proposal: markPaymentSentAction with B's proposal id as the token",
    run: () => markPaymentSentAction({ token: ids.proposalB, note: "REF-12345" }),
    // Needs an accepted proposal with a deposit invoice; respondProposalAction covers the token path.
    control: false,
  },
  {
    name: "invoice + invoice_item: updateInvoiceAction (replaces B's line items)",
    run: () =>
      updateInvoiceAction(
        invoiceInput({ invoiceId: ids.invoiceB, clientId: ids.clientB, projectId: ids.projectB }),
      ),
  },
  {
    name: "invoice: updateInvoiceStatusAction (paid -> sent)",
    run: () => updateInvoiceStatusAction({ invoiceId: ids.invoiceBPaid, status: "sent" }),
  },
  { name: "invoice: sendInvoiceAction", run: () => sendInvoiceAction(ids.invoiceB) },
  { name: "invoice: sendReminderAction", run: () => sendReminderAction(ids.invoiceB) },
  { name: "invoice: markInvoicePaidAction", run: () => markInvoicePaidAction(ids.invoiceB) },
  { name: "invoice: deleteInvoiceAction", run: () => deleteInvoiceAction(ids.invoiceB) },
  { name: "invoice: clearPaymentClaimAction", run: () => clearPaymentClaimAction(ids.invoiceB) },
  { name: "invoice: linkInvoiceProjectAction", run: () => linkInvoiceProjectAction(ids.invoiceB, ids.projectB) },
];

/** A creating or re-parenting its own records under B's clients, projects and milestones. */
const childCases: WriteCase[] = [
  {
    name: "project under B's client: createProjectAction",
    run: () => createProjectAction(projectInput(ids.clientB)),
  },
  {
    name: "milestone under B's project: createMilestoneAction",
    run: () => createMilestoneAction(ids.projectB, { title: "Iso stage" }),
  },
  {
    name: "invoice for B's client: createInvoiceAction",
    run: () => createInvoiceAction(invoiceInput({ clientId: ids.clientB })),
  },
  {
    name: "invoice on B's project: createInvoiceAction",
    run: () => createInvoiceAction(invoiceInput({ clientId: ids.clientA, projectId: ids.projectB })),
    control: () => createInvoiceAction(invoiceInput({ clientId: ids.clientB, projectId: ids.projectB })),
  },
  {
    name: "invoice_item billing B's milestone: createInvoiceAction",
    run: () =>
      createInvoiceAction(
        invoiceInput({
          clientId: ids.clientA,
          projectId: ids.projectA,
          lineItems: [{ description: "Iso work", quantity: 1, rate: 100, unit: "item", milestoneId: ids.milestoneB }],
        }),
      ),
    control: () =>
      createInvoiceAction(
        invoiceInput({
          clientId: ids.clientB,
          projectId: ids.projectB,
          lineItems: [{ description: "Iso work", quantity: 1, rate: 100, unit: "item", milestoneId: ids.milestoneB }],
        }),
      ),
  },
  {
    name: "proposal for B's client: createProposalAction",
    run: () => createProposalAction(proposalInput(ids.clientB)),
  },
  {
    name: "A's invoice moved to B's client: updateInvoiceAction",
    run: () => updateInvoiceAction(invoiceInput({ invoiceId: ids.invoiceA, clientId: ids.clientB })),
    control: false,
  },
  {
    name: "A's invoice linked to B's project: linkInvoiceProjectAction",
    run: () => linkInvoiceProjectAction(ids.invoiceA, ids.projectB),
    control: false,
  },
  {
    name: "A's draft proposal moved to B's client: updateProposalAction",
    run: () => updateProposalAction({ ...proposalInput(ids.clientB), proposalId: ids.proposalA }),
    control: false,
  },
  {
    name: "A's project claiming B's milestone id: updateProjectAction",
    run: () =>
      updateProjectAction(ids.projectA, {
        milestones: [{ id: ids.milestoneB, title: "hijacked", dueDate: "", amount: "" }],
      }),
    control: false,
    mayReportSuccess: true,
  },
  {
    name: "viewProposalAction with B's proposal id as the token",
    run: () => viewProposalAction(ids.proposalB),
    control: false,
    mayReportSuccess: true,
  },
];

/** List, search and aggregate reads: nothing of B's, and identical with B's data gone. */
const listCases: { name: string; run: () => Promise<unknown> }[] = [
  { name: "getClientList", run: () => getClientList({}) },
  { name: "getClientList search", run: () => getClientList({ search: MARK }) },
  { name: "getClientList archived", run: () => getClientList({ view: "archived" }) },
  { name: "getClientOptions", run: () => getClientOptions() },
  { name: "getProjectBoard", run: () => getProjectBoard({}) },
  { name: "getProjectBoard search", run: () => getProjectBoard({ search: MARK }) },
  { name: "getProjectBoard scoped to B's client", run: () => getProjectBoard({}, { clientId: ids.clientB }) },
  { name: "getProjectOptionsByUserId", run: () => getProjectOptionsByUserId() },
  { name: "getClientProjectOptions(B's client)", run: () => getClientProjectOptions(ids.clientB) },
  { name: "getMilestonesByProjectId(B's project)", run: () => getMilestonesByProjectId(ids.projectB) },
  { name: "getInvoicesForProject(B's project)", run: () => getInvoicesForProject(ids.projectB) },
  { name: "getInvoiceList", run: () => getInvoiceList({}) },
  { name: "getInvoiceList search", run: () => getInvoiceList({ search: MARK }) },
  { name: "getInvoiceList scoped to B's client", run: () => getInvoiceList({}, { clientId: ids.clientB }) },
  { name: "getInvoiceReminderDates(B's invoice)", run: () => getInvoiceReminderDates(ids.invoiceB) },
  { name: "getProposalList", run: () => getProposalList({}) },
  { name: "getProposalList search", run: () => getProposalList({ search: MARK }) },
  { name: "getProposalList scoped to B's client", run: () => getProposalList({}, { clientId: ids.clientB }) },
  { name: "getDashboardOverview", run: () => dashboardQueries.getDashboardOverview() },
  { name: "getRecentActivity", run: () => dashboardQueries.getRecentActivity() },
  { name: "getActiveProjects", run: () => dashboardQueries.getActiveProjects() },
  { name: "getOpenProposals", run: () => dashboardQueries.getOpenProposals() },
  { name: "getAttentionItems", run: () => attentionQueries.getAttentionItems() },
  { name: "getDashboardMoney", run: () => moneyQueries.getDashboardMoney() },
  { name: "getDashboardData(A)", run: () => layoutQueries.getDashboardData(USER_A.id) },
  { name: "getSidebarCounts(A)", run: () => layoutQueries.getSidebarCounts(USER_A.id) },
  { name: "getProfileSettings", run: () => settingsQueries.getProfileSettings() },
  { name: "getIssuerTitle", run: () => settingsQueries.getIssuerTitle() },
  { name: "getHasPaymentDetails", run: () => settingsQueries.getHasPaymentDetails() },
  { name: "getBusinessSettings", run: () => settingsQueries.getBusinessSettings() },
  { name: "getBrandingSettings", run: () => settingsQueries.getBrandingSettings() },
  { name: "getInvoiceTemplateSetting", run: () => settingsQueries.getInvoiceTemplateSetting() },
  { name: "getPaymentSettings", run: () => settingsQueries.getPaymentSettings() },
  { name: "getDocumentDefaults", run: () => settingsQueries.getDocumentDefaults() },
  { name: "getPlanUsage", run: () => settingsQueries.getPlanUsage() },
];

/** Single-record reads by B's ids; `id` is what B's own call must return. */
const detailCases: { name: string; run: () => Promise<unknown>; id: () => string }[] = [
  { name: "getClientById", run: () => getClientById(ids.clientB), id: () => ids.clientB },
  // Lifetime billed: B's sent invoice plus the paid one.
  { name: "getClientSummary", run: () => getClientSummary(ids.clientB), id: () => "15555.54" },
  { name: "getProjectById", run: () => getProjectById(ids.projectB), id: () => ids.projectB },
  {
    name: "getMilestoneForInvoice",
    run: () => getMilestoneForInvoice(ids.milestoneB, ids.projectB),
    id: () => ids.milestoneB,
  },
  { name: "getProposalForProject", run: () => getProposalForProject(ids.proposalB), id: () => ids.proposalB },
  { name: "getInvoiceById (with line items)", run: () => getInvoiceById(ids.invoiceB), id: () => ids.invoiceB },
  { name: "getInvoiceForPdf", run: () => getInvoiceForPdf(ids.invoiceB), id: () => MARK },
  {
    name: "getInvoicePdfDataForOwner(B's invoice, A)",
    run: () => getInvoicePdfDataForOwner(ids.invoiceB, live.user?.id ?? ""),
    id: () => MARK,
  },
  { name: "getProposalById", run: () => getProposalById(ids.proposalB), id: () => ids.proposalB },
  { name: "getProjectForProposal", run: () => getProjectForProposal(ids.proposalB), id: () => ids.projectB },
];

beforeAll(async () => {
  if (!process.env.DATABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("The isolation suite needs DATABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.");
  }
  vi.spyOn(console, "error").mockImplementation(() => {});

  const admin = adminClient();
  [USER_A.id, USER_B.id] = await Promise.all([
    ensureTestUser(admin, USER_A.email, "Isolation A"),
    ensureTestUser(admin, USER_B.email, "Isolation B"),
  ]);

  suite = await hold((fn) => realDb.transaction(fn));
  await seed(suite.tx);
});

afterAll(async () => {
  await suite?.release();
  await realDb.$client.end();
});

beforeEach(async () => {
  vi.clearAllMocks();
  signOut();
  current = await hold((fn) => suite.tx.transaction(fn));
  live.tx = current.tx;
});

afterEach(async () => {
  live.tx = null;
  await current?.release();
  current = null;
});

describe("acting as A, B's records are invisible", () => {
  for (const { name, run } of listCases) {
    it(`${name} returns none of B's rows`, async () => {
      signIn(USER_A);
      expect(leaksOfB(await run())).toEqual([]);
    });
  }

  it("every list and total reads the same for A with B's data deleted", async () => {
    signIn(USER_A);
    const withB: unknown[] = [];
    for (const { run } of listCases) withB.push(await run());
    await wipeB();
    const withoutB: unknown[] = [];
    for (const { run } of listCases) withoutB.push(await run());
    listCases.forEach(({ name }, i) => {
      expect(withoutB[i], name).toEqual(withB[i]);
    });
  }, 180_000);

  for (const { name, run } of detailCases) {
    it(`${name} returns nothing for B's record`, async () => {
      signIn(USER_A);
      const outcome = await settle(run);
      if ("value" in outcome) {
        expect(isEmpty(outcome.value)).toBe(true);
        expect(leaksOfB(outcome.value)).toEqual([]);
      }
    });
  }
});

describe("control: B sees its own records", () => {
  it("B's search finds B's client, project, invoice and proposal", async () => {
    signIn(USER_B);
    const found = JSON.stringify(
      await Promise.all([
        getClientList({ search: MARK }),
        getProjectBoard({ search: MARK }),
        getInvoiceList({ search: MARK }),
        getProposalList({ search: MARK }),
      ]),
    );
    for (const id of [ids.clientB, ids.projectB, ids.invoiceB, ids.proposalB]) {
      expect(found).toContain(id);
    }
  });

  for (const { name, run, id } of detailCases) {
    it(`${name} returns B's record to B`, async () => {
      signIn(USER_B);
      expect(JSON.stringify(await run())).toContain(id());
    });
  }
});

describe("acting as A, writes to B's records are rejected and change nothing", () => {
  for (const { name, run, mayReportSuccess } of [...writeCases, ...childCases]) {
    it(name, async () => {
      const before = await snapshotB();
      signIn(USER_A);
      const result = await run();
      if (!mayReportSuccess) expect(result.success).toBe(false);
      expect(await snapshotB()).toEqual(before);
      expect(sendEmail).not.toHaveBeenCalled();
    });
  }
});

describe("control: the same writes succeed for B", () => {
  for (const { name, run, control } of [...writeCases, ...childCases]) {
    if (control === false) continue;
    it(name, async () => {
      signIn(USER_B);
      expect(await (control ?? run)()).toMatchObject({ success: true });
    });
  }
});

describe("routes and the public page", () => {
  const pdf = (id: string) =>
    invoicePdf(new Request(`http://localhost/api/invoices/${id}/pdf`), {
      params: Promise.resolve({ id }),
    });

  it("GET /api/invoices/<B's invoice>/pdf as A is a 404, not a PDF", async () => {
    signIn(USER_A);
    const response = await pdf(ids.invoiceB);
    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).not.toBe("application/pdf");
    expect(leaksOfB(await response.text())).toEqual([]);
  });

  it("control: B downloads the same PDF", async () => {
    signIn(USER_B);
    const response = await pdf(ids.invoiceB);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(Buffer.from(await response.arrayBuffer()).subarray(0, 4).toString()).toBe("%PDF");
  });

  it("/api/account/export as A holds A's rows and none of B's", async () => {
    signIn(USER_A);
    const response = await accountExport(new Request("http://localhost/api/account/export?format=json"));
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain(ids.clientA);
    expect(leaksOfB(body)).toEqual([]);
  });

  it("control: B's export holds B's rows", async () => {
    signIn(USER_B);
    const response = await accountExport(new Request("http://localhost/api/account/export?format=json"));
    const body = await response.text();
    for (const id of [ids.clientB, ids.projectB, ids.milestoneB, ids.proposalB, ids.invoiceB]) {
      expect(body).toContain(id);
    }
  });

  const page = async (value: string) =>
    (await PublicProposalPage({ params: Promise.resolve({ token: value }) })) as ReactElement<{
      proposal?: { title: string };
    }>;

  it("/p/<B's token> signed out renders B's proposal", async () => {
    signOut();
    const element = await page(ids.tokenB);
    expect(element.type).toBe(PublicProposalView);
    expect(element.props.proposal?.title).toBe(`${MARK} proposal`);
  });

  it("/p/<random token> shows the unavailable page and nothing of B's", async () => {
    signOut();
    const element = await page(token());
    expect(element.type).toBe(ProposalUnavailable);
    expect(leaksOfB(element.props)).toEqual([]);
    // Same answer for a real id that isn't a token.
    expect((await page(ids.proposalB)).type).toBe(ProposalUnavailable);
    expect((await getProposalByToken(ids.proposalB)).success).toBe(false);
  });
});

/** Every exported function the cases above call. */
const COVERED = new Set<unknown>([
  updateClientAction,
  deleteClientAction,
  getClientList,
  getClientById,
  getClientOptions,
  getClientSummary,
  createProjectAction,
  updateProjectAction,
  deleteProjectAction,
  createMilestoneAction,
  updateMilestoneAction,
  setMilestoneStatusAction,
  deleteMilestoneAction,
  getProjectById,
  getProjectOptionsByUserId,
  getMilestonesByProjectId,
  getInvoicesForProject,
  getProposalForProject,
  getProjectBoard,
  getMilestoneForInvoice,
  getClientProjectOptions,
  createInvoiceAction,
  updateInvoiceAction,
  updateInvoiceStatusAction,
  sendInvoiceAction,
  sendReminderAction,
  markInvoicePaidAction,
  deleteInvoiceAction,
  clearPaymentClaimAction,
  linkInvoiceProjectAction,
  getInvoiceById,
  getInvoiceForPdf,
  getInvoicePdfDataForOwner,
  getInvoiceList,
  getInvoiceReminderDates,
  getProposalByToken,
  createProposalAction,
  sendProposalAction,
  emailProposalAction,
  revokeProposalAction,
  duplicateProposalAction,
  createProjectFromProposalAction,
  updateProposalAction,
  deleteProposalAction,
  viewProposalAction,
  respondProposalAction,
  markPaymentSentAction,
  getProposalById,
  getProjectForProposal,
  getProposalList,
  dashboardQueries.getDashboardOverview,
  dashboardQueries.getRecentActivity,
  dashboardQueries.getActiveProjects,
  dashboardQueries.getOpenProposals,
  attentionQueries.getAttentionItems,
  moneyQueries.getDashboardMoney,
  layoutQueries.getDashboardData,
  layoutQueries.getSidebarCounts,
  settingsQueries.getProfileSettings,
  settingsQueries.getIssuerTitle,
  settingsQueries.getHasPaymentDetails,
  settingsQueries.getBusinessSettings,
  settingsQueries.getBrandingSettings,
  settingsQueries.getInvoiceTemplateSetting,
  settingsQueries.getPaymentSettings,
  settingsQueries.getDocumentDefaults,
  settingsQueries.getPlanUsage,
]);

/** Exported functions this suite deliberately does not call, and why. */
const NOT_COVERED: Record<string, string> = {
  createClientAction: "creates under the signed-in user only; takes no parent id",
  getProposalDisplayStatus: "pure function, no data access",
  requestAccountDeletionAction: "acts only on the signed-in user's own account; takes no record id",
  restoreAccountAction: "acts only on the signed-in user's own account; takes no record id",
  keepAccountDeletedAction: "acts only on the signed-in user's own account; takes no record id",
  startCheckoutAction: "own subscription only, and calls the payment provider",
  manageBillingAction: "own subscription only, and calls the payment provider",
  updateProfileAction: "writes only the signed-in user's row; takes no record id",
  updateBusinessAction: "writes only the signed-in user's row; takes no record id",
  updateBrandingAction: "writes only the signed-in user's row; takes no record id",
  uploadLogoAction: "writes only the signed-in user's row, and calls ImageKit",
  removeLogoAction: "writes only the signed-in user's row, and calls ImageKit",
  updateInvoiceTemplateAction: "writes only the signed-in user's row; takes no record id",
  upsertPaymentMethodAction: "keyed by (signed-in user, method type); takes no record id",
  setPaymentMethodVisibilityAction: "keyed by (signed-in user, method type); takes no record id",
  updatePaymentInstructionsAction: "writes only the signed-in user's row; takes no record id",
};

it("every exported action and query is either covered above or listed in NOT_COVERED", () => {
  const modules = [
    clientActions,
    clientQueries,
    projectActions,
    milestoneActions,
    projectQueries,
    invoiceActions,
    invoiceQueries,
    proposalActions,
    publicActions,
    proposalQueries,
    dashboardQueries,
    attentionQueries,
    moneyQueries,
    layoutQueries,
    settingsActions,
    billingActions,
    settingsQueries,
    accountActions,
  ];
  const unaccounted = modules.flatMap((mod) =>
    Object.entries(mod)
      .filter(([name, value]) => typeof value === "function" && !COVERED.has(value) && !(name in NOT_COVERED))
      .map(([name]) => name),
  );
  expect(unaccounted).toEqual([]);
});
