import { Transaction } from "@/src/db";
import { invoiceCounters } from "@/src/db/schema/invoice-counters";
import { sql } from "drizzle-orm";
import { AppError } from "./errors";

export async function getNextInvoiceNumber(tx: Transaction, userId: string) {
  const [row] = await tx
    .insert(invoiceCounters)
    .values({ userId, lastNumber: 1 })
    .onConflictDoUpdate({
      target: invoiceCounters.userId,
      set: {
        lastNumber: sql`${invoiceCounters.lastNumber} + 1`,
      },
    })
    .returning({ lastNumber: invoiceCounters.lastNumber });

  if (!row) {
    throw new AppError(
      "GENERATION_FAILED",
      "Failed to generate invoice number",
    );
  }

  return row.lastNumber;
}
