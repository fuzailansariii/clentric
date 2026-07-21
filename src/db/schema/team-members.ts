import {
  pgTable,
  text,
  uuid,
  timestamp,
  index,
  pgEnum,
  unique,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const teamMembersRoleEnum = pgEnum("team_member_role", [
  "owner",
  "admin",
  "member",
]);

export const teamMembers = pgTable(
  "team_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    memberEmail: text("member_email").notNull(),
    role: teamMembersRoleEnum("role").notNull().default("member"),
    invitedAt: timestamp("invited_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    joinedAt: timestamp("joined_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_team_members_owner_id").on(table.ownerId),
    unique("uq_owner_member_email").on(table.ownerId, table.memberEmail),
  ],
);
