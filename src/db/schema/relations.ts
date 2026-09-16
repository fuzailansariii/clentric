/**
 * Drizzle `relations()` declarations.
 *
 * These are TypeScript-only — they emit no DDL and need no migration. The real
 * foreign keys already live on each table via `.references()`. What this file
 * adds is the relational query builder (`db.query.<table>.findFirst/findMany`
 * with `with: { ... }`), which is registered in `src/db/index.ts`.
 *
 * Use `db.query` for *detail* reads (one entity plus its children). Keep the
 * hand-written joins in the list queries: the relational builder can't filter a
 * parent by a joined table's columns, and can't do the `rollup()` aggregates the
 * invoice list summary depends on.
 *
 * Note: `with` does not apply ownership or soft-delete filters for you. The
 * top-level `where` must still check `userId` and `isNull(deletedAt)`.
 */
import { relations } from "drizzle-orm";

import { activityLog } from "./activity-logs";
import { clientPortalTokens } from "./client-portal-tokens";
import { clients } from "./clients";
import { invoiceCounters } from "./invoice-counters";
import { invoiceItems } from "./invoice-items";
import { invoices } from "./invoices";
import { milestones } from "./milestones";
import { notifications } from "./notifications";
import { projects } from "./projects";
import { proposalItems } from "./proposal-items";
import { proposals } from "./proposals";
import { subscriptions } from "./subscriptions";
import { teamMembers } from "./team-members";
import { users } from "./users";

// The account root: everything a freelancer owns hangs off this row.
export const usersRelations = relations(users, ({ one, many }) => ({
  clients: many(clients),
  projects: many(projects),
  invoices: many(invoices),
  proposals: many(proposals),
  notifications: many(notifications),
  activityLogs: many(activityLog),
  subscriptions: many(subscriptions),
  teamMembers: many(teamMembers),
  invoiceCounter: one(invoiceCounters, {
    fields: [users.id],
    references: [invoiceCounters.userId],
  }),
}));

// A client belongs to one user and is the anchor for their billable work.
export const clientsRelations = relations(clients, ({ one, many }) => ({
  user: one(users, { fields: [clients.userId], references: [users.id] }),
  projects: many(projects),
  invoices: many(invoices),
  proposals: many(proposals),
  portalTokens: many(clientPortalTokens),
}));

// A project sits under both a user and a client, and holds the milestone plan.
export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, { fields: [projects.userId], references: [users.id] }),
  client: one(clients, {
    fields: [projects.clientId],
    references: [clients.id],
  }),
  milestones: many(milestones),
  invoices: many(invoices),
}));

// A milestone is meaningless on its own — always read it through its project.
export const milestonesRelations = relations(milestones, ({ one }) => ({
  project: one(projects, {
    fields: [milestones.projectId],
    references: [projects.id],
  }),
}));

// `project` is optional here (nullable FK, `on delete set null`).
export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  user: one(users, { fields: [invoices.userId], references: [users.id] }),
  client: one(clients, {
    fields: [invoices.clientId],
    references: [clients.id],
  }),
  project: one(projects, {
    fields: [invoices.projectId],
    references: [projects.id],
  }),
  lineItems: many(invoiceItems),
}));

// Named `lineItems` on the invoice side to match the form and query wording.
export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceItems.invoiceId],
    references: [invoices.id],
  }),
}));

// Mirrors the invoice shape, so the public share page can load it in one go.
export const proposalsRelations = relations(proposals, ({ one, many }) => ({
  user: one(users, { fields: [proposals.userId], references: [users.id] }),
  client: one(clients, {
    fields: [proposals.clientId],
    references: [clients.id],
  }),
  items: many(proposalItems),
}));

// Cascade-deleted with its proposal; only ever fetched alongside one.
export const proposalItemsRelations = relations(proposalItems, ({ one }) => ({
  proposal: one(proposals, {
    fields: [proposalItems.proposalId],
    references: [proposals.id],
  }),
}));

// Lets a portal token resolve straight to the client it was minted for.
export const clientPortalTokensRelations = relations(
  clientPortalTokens,
  ({ one }) => ({
    client: one(clients, {
      fields: [clientPortalTokens.clientId],
      references: [clients.id],
    }),
  }),
);

// Always the recipient's own row — the `where` still has to check `userId`.
export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

// `user` can be null: the log outlives a deleted account (`on delete set null`).
export const activityLogRelations = relations(activityLog, ({ one }) => ({
  user: one(users, { fields: [activityLog.userId], references: [users.id] }),
}));

// Billing record for the account; the plan enum is shared with `users.plan`.
export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, { fields: [subscriptions.userId], references: [users.id] }),
}));

// Only the owner links back — members are matched by email, so there's no FK.
export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  owner: one(users, { fields: [teamMembers.ownerId], references: [users.id] }),
}));

// True one-to-one: `invoice_counters.user_id` is the primary key.
export const invoiceCountersRelations = relations(
  invoiceCounters,
  ({ one }) => ({
    user: one(users, {
      fields: [invoiceCounters.userId],
      references: [users.id],
    }),
  }),
);

// `webhook_events` and `waitlist` have no foreign keys, so they declare none.
