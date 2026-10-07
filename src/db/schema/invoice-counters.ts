import { integer, pgTable, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";

export const invoiceCounters = pgTable("invoice_counters", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),

  lastNumber: integer("last_number").notNull().default(0),
});
