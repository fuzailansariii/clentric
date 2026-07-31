import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
} from "drizzle-orm/pg-core";
import { authUsers } from "drizzle-orm/supabase";

const planEnum = pgEnum("subscription_plan", ["free", "pro", "agency"]);

export const users = pgTable("users", {
  id: uuid("id")
    .primaryKey()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  email: text("email").notNull().unique(),
  name: text("name"),
  avatar: text("avatar"),
  profession: text("profession"),
  plan: planEnum("plan").notNull().default("free"),
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
  timezone: text("timezone").default("UTC"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});
