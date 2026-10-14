import { countLabel, type PlanLimits } from "./plans";

export type LimitKind = keyof PlanLimits;
export type PlanUsageCounts = Record<LimitKind, number>;

const NOUN: Record<LimitKind, string> = {
  clients: "client",
  projects: "project",
  proposals: "proposal",
  invoicesPerMonth: "invoice",
};

/** True when creating one more of this kind would go over the limit. */
export function limitReached(
  usage: PlanUsageCounts,
  limits: PlanLimits,
  kind: LimitKind,
): boolean {
  return usage[kind] >= limits[kind];
}

/** The first of these kinds that is full, or null when all have room. */
export function firstFullLimit(
  usage: PlanUsageCounts,
  limits: PlanLimits,
  kinds: readonly LimitKind[],
): LimitKind | null {
  return kinds.find((kind) => limitReached(usage, limits, kind)) ?? null;
}

export function planLimitMessage(kind: LimitKind, limit: number): string {
  const noun = NOUN[kind];
  if (kind === "invoicesPerMonth") {
    return `The Free plan includes ${countLabel(limit, noun)} a month. Upgrade to Pro for unlimited invoices, or create more next month.`;
  }
  return `The Free plan includes ${countLabel(limit, noun)}. Upgrade to Pro for unlimited ${noun}s.`;
}
