import { pgEnum } from "drizzle-orm/pg-core";

/**
 * Enums shared by more than one table live here.
 *
 * `pgEnum` is a declaration of a single Postgres type, so declaring the same
 * name in two files gives drizzle-kit two competing definitions of one type.
 * Both `users.plan` and `subscriptions.plan` use this one.
 */
export const subscriptionPlanEnum = pgEnum("subscription_plan", [
  "free",
  "pro",
  "agency",
]);
