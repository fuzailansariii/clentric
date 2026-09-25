"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNotNull, isNull } from "drizzle-orm";
import type { ActionResult } from "@/lib/action-result";
import { requireUser } from "@/lib/current-user";
import { logError } from "@/lib/errors";
import { db } from "@/src/db";
import { users } from "@/src/db/schema/users";
import { userPaymentMethods } from "@/src/db/schema/payment-methods";
import {
  PAYMENT_METHOD_FIELDS,
  PAYMENT_METHOD_LABELS,
  type PaymentFieldName,
} from "@/lib/payment-methods";
import {
  businessSchema,
  paymentInstructionsSchema,
  paymentMethodSchema,
  paymentMethodVisibilitySchema,
  profileSchema,
} from "./schema";

export async function updateProfileAction(
  input: unknown,
): Promise<ActionResult> {
  try {
    const parsed = profileSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const user = await requireUser();

    const [row] = await db
      .update(users)
      .set({
        name: parsed.data.fullName,
        profession: parsed.data.profession ?? null,
        updatedAt: new Date(),
      })
      .where(and(eq(users.id, user.id), isNull(users.deletedAt)))
      .returning({ id: users.id });

    if (!row) {
      return { success: false, error: "Could not find your account." };
    }

    // The name shows in the dashboard layout (sidebar footer, top bar) on
    // every signed-in page, and as the sender on invoices and public
    // proposal pages, so refresh everything under the root layout.
    revalidatePath("/", "layout");

    return { success: true };
  } catch (error) {
    logError("updateProfileAction", error);
    return { success: false, error: "Could not save your profile. Try again." };
  }
}

export async function updateBusinessAction(
  input: unknown,
): Promise<ActionResult> {
  try {
    const parsed = businessSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const user = await requireUser();

    // Blank means "not set": stored as null so documents skip the line.
    const blankToNull = (value: string) => value.trim() || null;

    const [row] = await db
      .update(users)
      .set({
        businessName: blankToNull(parsed.data.businessName),
        businessEmail: blankToNull(parsed.data.businessEmail),
        website: blankToNull(parsed.data.website),
        taxId: blankToNull(parsed.data.taxId),
        address: blankToNull(parsed.data.address),
        updatedAt: new Date(),
      })
      .where(and(eq(users.id, user.id), isNull(users.deletedAt)))
      .returning({ id: users.id });

    if (!row) {
      return { success: false, error: "Could not find your account." };
    }

    // Draft invoices, draft proposals and anything sent before snapshots
    // existed all read these live: the invoice pages, the proposal pages,
    // /p/[token] and the settings page itself.
    revalidatePath("/", "layout");

    return { success: true };
  } catch (error) {
    logError("updateBusinessAction", error);
    return {
      success: false,
      error: "Could not save your business details. Try again.",
    };
  }
}

// Columns per payment field, for building "is this method set up?" checks.
const PAYMENT_FIELD_COLUMNS = {
  accountHolder: userPaymentMethods.accountHolder,
  bankName: userPaymentMethods.bankName,
  accountNumber: userPaymentMethods.accountNumber,
  routingCode: userPaymentMethods.routingCode,
  paypalEmail: userPaymentMethods.paypalEmail,
  wiseAccount: userPaymentMethods.wiseAccount,
  upiId: userPaymentMethods.upiId,
} satisfies Record<PaymentFieldName, unknown>;

export async function upsertPaymentMethodAction(
  input: unknown,
): Promise<ActionResult> {
  try {
    const parsed = paymentMethodSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const user = await requireUser();
    const { type, showOnInvoices } = parsed.data;

    // Store only the chosen type's fields; everything else is cleared, so a
    // row never carries stale details from another method's form.
    const wanted = new Set(PAYMENT_METHOD_FIELDS[type].map((f) => f.name));
    const fields = Object.fromEntries(
      (Object.keys(PAYMENT_FIELD_COLUMNS) as PaymentFieldName[]).map((name) => [
        name,
        wanted.has(name) ? parsed.data[name] || null : null,
      ]),
    ) as Record<PaymentFieldName, string | null>;

    const [row] = await db
      .insert(userPaymentMethods)
      .values({
        userId: user.id,
        type,
        ...fields,
        // A method someone just set up is one they want clients to see.
        showOnInvoices: showOnInvoices ?? true,
      })
      .onConflictDoUpdate({
        target: [userPaymentMethods.userId, userPaymentMethods.type],
        set: {
          ...fields,
          ...(showOnInvoices !== undefined && { showOnInvoices }),
          // Saving a soft-deleted method brings it back.
          deletedAt: null,
          updatedAt: new Date(),
        },
        // Ownership in the write itself, not just in the conflict target.
        setWhere: eq(userPaymentMethods.userId, user.id),
      })
      .returning({ id: userPaymentMethods.id });

    if (!row) {
      return { success: false, error: "Could not save this payment method." };
    }

    // Draft invoices read payment methods live on every invoice page and
    // PDF; sent ones are unaffected (they carry a snapshot).
    revalidatePath("/", "layout");

    return { success: true };
  } catch (error) {
    logError("upsertPaymentMethodAction", error);
    return {
      success: false,
      error: "Could not save this payment method. Try again.",
    };
  }
}

export async function setPaymentMethodVisibilityAction(
  input: unknown,
): Promise<ActionResult> {
  try {
    const parsed = paymentMethodVisibilitySchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const user = await requireUser();
    const { type, show } = parsed.data;

    // Switching on needs every field the method uses. The WHERE enforces
    // it (the payment_method_set_up_to_show CHECK is the backstop), so a
    // half-filled method can't slip onto invoices.
    const isSetUp = and(
      ...PAYMENT_METHOD_FIELDS[type].map((field) =>
        isNotNull(PAYMENT_FIELD_COLUMNS[field.name]),
      ),
    );

    const [row] = await db
      .update(userPaymentMethods)
      .set({ showOnInvoices: show, updatedAt: new Date() })
      .where(
        and(
          eq(userPaymentMethods.userId, user.id),
          eq(userPaymentMethods.type, type),
          isNull(userPaymentMethods.deletedAt),
          show ? isSetUp : undefined,
        ),
      )
      .returning({ id: userPaymentMethods.id });

    if (!row) {
      return {
        success: false,
        error: `Set up ${PAYMENT_METHOD_LABELS[type]} before showing it on invoices.`,
      };
    }

    revalidatePath("/", "layout");

    return { success: true };
  } catch (error) {
    logError("setPaymentMethodVisibilityAction", error);
    return { success: false, error: "Could not update that. Try again." };
  }
}

export async function updatePaymentInstructionsAction(
  input: unknown,
): Promise<ActionResult> {
  try {
    const parsed = paymentInstructionsSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const user = await requireUser();

    const [row] = await db
      .update(users)
      .set({
        paymentDetails: parsed.data.instructions || null,
        updatedAt: new Date(),
      })
      .where(and(eq(users.id, user.id), isNull(users.deletedAt)))
      .returning({ id: users.id });

    if (!row) {
      return { success: false, error: "Could not find your account." };
    }

    revalidatePath("/", "layout");

    return { success: true };
  } catch (error) {
    logError("updatePaymentInstructionsAction", error);
    return {
      success: false,
      error: "Could not save your payment instructions. Try again.",
    };
  }
}
