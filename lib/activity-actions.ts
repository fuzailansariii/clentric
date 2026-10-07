/** Every action the feed knows, and the entity type each one is about. */
export const ACTIVITY_ACTIONS = {
  "client.created": "client",
  "invoice.created": "invoice",
  "invoice.sent": "invoice",
  "invoice.reminder_sent": "invoice",
  "invoice.paid": "invoice",
  "invoice.payment_claimed": "invoice",
  "proposal.created": "proposal",
  "proposal.sent": "proposal",
  "proposal.revoked": "proposal",
  "proposal.viewed": "proposal",
  "proposal.accepted": "proposal",
  "proposal.declined": "proposal",
  "project.created": "project",
  "milestone.completed": "milestone",
} as const;

export type ActivityAction = keyof typeof ACTIVITY_ACTIONS;
export type ActivityEntityType = (typeof ACTIVITY_ACTIONS)[ActivityAction];

/** Extra detail for the actions that carry some; names are joined on read. */
export type ActivityMetadata = {
  "proposal.declined": { reason: string | null };
  "invoice.payment_claimed": { note: string | null };
};
