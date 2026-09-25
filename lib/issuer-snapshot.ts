import { and, asc, eq, isNull, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { userPaymentMethods } from "@/src/db/schema/payment-methods";
import {
  PAYMENT_METHOD_TYPES,
  type PaymentDetails,
  type PaymentMethodDetails,
} from "./payment-methods";

/**
 * The sender ("issuer") block printed on an invoice or proposal, plus how
 * to pay them.
 *
 * While a document is a draft it reads these fields live. The moment it is
 * sent, the same UPDATE that flips its status copies them into the
 * document's `issuer_snapshot` column, so editing your address, business
 * name or bank details later never rewrites something a client already has.
 *
 * Stored as one jsonb value rather than a column per field: it is written
 * once, always read whole, and never filtered, joined or summed — the
 * reasons line items stay relational don't apply.
 *
 * `v` versions the shape:
 *   1 — identity only (documents sent before payment methods existed; their
 *       payment details still read the old way).
 *   2 — identity plus `payment`.
 * Readers parse with `issuerSnapshotSchema` and fall back to live data if a
 * row doesn't match.
 *
 * Server-only in practice (it imports Drizzle); client components format the
 * resolved details with lib/format-issuer.ts and lib/payment-methods.ts.
 */
const identityShape = {
  name: z.string().nullable(),
  email: z.string(),
  profession: z.string().nullable(),
  businessName: z.string().nullable(),
  website: z.string().nullable(),
  phone: z.string().nullable(),
  taxId: z.string().nullable(),
  address: z.string().nullable(),
};

const paymentMethodSnapshotSchema = z.object({
  type: z.enum(PAYMENT_METHOD_TYPES),
  accountHolder: z.string().nullable(),
  bankName: z.string().nullable(),
  accountNumber: z.string().nullable(),
  routingCode: z.string().nullable(),
  paypalEmail: z.string().nullable(),
  wiseAccount: z.string().nullable(),
  upiId: z.string().nullable(),
});

export const issuerSnapshotSchema = z.discriminatedUnion("v", [
  z.object({ v: z.literal(1), ...identityShape }),
  z.object({
    v: z.literal(2),
    ...identityShape,
    payment: z.object({
      methods: z.array(paymentMethodSnapshotSchema),
      instructions: z.string().nullable(),
    }),
  }),
]);

export type IssuerSnapshot = z.infer<typeof issuerSnapshotSchema>;

/** The issuer's identity fields as they come off a `users` row. */
export type IssuerDetails = {
  [K in keyof typeof identityShape]: z.infer<(typeof identityShape)[K]>;
};

/**
 * `columns` map for reading the live issuer through a relational query
 * (`with: { user: { columns: issuerUserColumns } }`). Mirrors the snapshot.
 */
export const issuerUserColumns = {
  name: true,
  email: true,
  // Printed in place of `email` when set — see liveIssuer.
  businessEmail: true,
  profession: true,
  businessName: true,
  website: true,
  phone: true,
  taxId: true,
  address: true,
  // "Other payment instructions"
  paymentDetails: true,
} as const;

/**
 * The payment methods a draft reads live: switched on, not deleted, in
 * display order. Use as `with: { paymentMethods: visiblePaymentMethods }`.
 */
export const visiblePaymentMethods = {
  columns: {
    type: true,
    accountHolder: true,
    bankName: true,
    accountNumber: true,
    routingCode: true,
    paypalEmail: true,
    wiseAccount: true,
    upiId: true,
  } as const,
  where: and(
    eq(userPaymentMethods.showOnInvoices, true),
    isNull(userPaymentMethods.deletedAt),
  ),
  // Enum order: bank, paypal, wise, upi.
  orderBy: [asc(userPaymentMethods.type)],
};

/**
 * SQL for the snapshot, built from the user's rows *inside* the UPDATE or
 * INSERT that sends the document, so there is no window between reading
 * the details and flipping the status.
 */
export function issuerSnapshotSql(userId: string): SQL<IssuerSnapshot> {
  return sql<IssuerSnapshot>`(
    select jsonb_build_object(
      'v', 2,
      'name', u.name,
      -- The business email when one is set, else the sign-in email.
      'email', coalesce(u.business_email, u.email),
      'profession', u.profession,
      'businessName', u.business_name,
      'website', u.website,
      'phone', u.phone,
      'taxId', u.tax_id,
      'address', u.address,
      'payment', jsonb_build_object(
        'instructions', u.payment_details,
        'methods', coalesce((
          select jsonb_agg(jsonb_build_object(
            'type', m.type,
            'accountHolder', m.account_holder,
            'bankName', m.bank_name,
            'accountNumber', m.account_number,
            'routingCode', m.routing_code,
            'paypalEmail', m.paypal_email,
            'wiseAccount', m.wise_account,
            'upiId', m.upi_id
          ) order by m.type)
          from user_payment_methods m
          where m.user_id = u.id
            and m.show_on_invoices
            and m.deleted_at is null
        ), '[]'::jsonb)
      )
    )
    from users u
    where u.id = ${userId}
  )`;
}

function parseSnapshot(snapshot: unknown): IssuerSnapshot | null {
  if (snapshot == null) return null;
  const parsed = issuerSnapshotSchema.safeParse(snapshot);
  return parsed.success ? parsed.data : null;
}

/**
 * Who to print as the sender: the snapshot when the document has a valid
 * one, otherwise the live details (drafts, and documents sent before
 * snapshots existed).
 */
export function resolveIssuer(
  snapshot: unknown,
  live: IssuerDetails,
): IssuerDetails {
  const data = parseSnapshot(snapshot);
  if (!data) return live;

  return {
    name: data.name,
    email: data.email,
    profession: data.profession,
    businessName: data.businessName,
    website: data.website,
    phone: data.phone,
    taxId: data.taxId,
    address: data.address,
  };
}

/**
 * How to pay, in order of precedence:
 *   1. the payment frozen into a v2 snapshot;
 *   2. the document's own legacy free-text `payment_details` (deposit
 *      invoices raised before payment methods existed);
 *   3. the live methods and instructions (drafts, and older documents).
 */
export function resolvePayment(
  snapshot: unknown,
  legacyText: string | null,
  live: PaymentDetails,
): PaymentDetails {
  const data = parseSnapshot(snapshot);
  if (data?.v === 2) return data.payment;
  if (legacyText?.trim()) return { methods: [], instructions: legacyText };
  return live;
}

/** Live payment details from a user row read with `issuerUserColumns`. */
export function livePayment(user: {
  paymentDetails: string | null;
  paymentMethods: PaymentMethodDetails[];
}): PaymentDetails {
  return {
    methods: user.paymentMethods,
    instructions: user.paymentDetails,
  };
}

/**
 * Splits a user row read with `issuerUserColumns` into identity + rest. The
 * business email, when set, stands in for the sign-in email — the same rule
 * issuerSnapshotSql applies when a document is sent.
 */
export function liveIssuer(
  user: IssuerDetails & { businessEmail: string | null } & Record<
      string,
      unknown
    >,
) {
  return {
    name: user.name,
    email: user.businessEmail ?? user.email,
    profession: user.profession,
    businessName: user.businessName,
    website: user.website,
    phone: user.phone,
    taxId: user.taxId,
    address: user.address,
  } satisfies IssuerDetails;
}
