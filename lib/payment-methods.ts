/**
 * Payment methods: labels, fields and formatting shared by the settings
 * page, the invoice page, the PDF and the public proposal page. No Drizzle
 * imports, so client components can use it.
 */

export const PAYMENT_METHOD_TYPES = ["bank", "paypal", "wise", "upi"] as const;

export type PaymentMethodType = (typeof PAYMENT_METHOD_TYPES)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodType, string> = {
  bank: "Bank transfer",
  paypal: "PayPal",
  wise: "Wise",
  upi: "UPI",
};

export type PaymentFieldName =
  | "accountHolder"
  | "bankName"
  | "accountNumber"
  | "routingCode"
  | "paypalEmail"
  | "wiseAccount"
  | "upiId";

/** One method's details, as stored and as frozen into a snapshot. */
export type PaymentMethodDetails = { type: PaymentMethodType } & Record<
  PaymentFieldName,
  string | null
>;

/** Everything an invoice prints under "Payment details". */
export type PaymentDetails = {
  /** Only the methods switched on for invoices, in display order. */
  methods: PaymentMethodDetails[];
  /** Free text: users.payment_details ("Other payment instructions"). */
  instructions: string | null;
};

type PaymentField = {
  name: PaymentFieldName;
  label: string;
  placeholder: string;
  inputMode?: "email" | "text";
};

/**
 * The fields each method's dialog asks for, in order. Every one is required:
 * a method counts as set up when all of its fields are filled in (the same
 * rule the payment_method_set_up_to_show CHECK enforces in the database).
 */
export const PAYMENT_METHOD_FIELDS: Record<PaymentMethodType, PaymentField[]> =
  {
    bank: [
      {
        name: "accountHolder",
        label: "Account holder",
        placeholder: "e.g. Alex Doe",
      },
      { name: "bankName", label: "Bank name", placeholder: "e.g. HDFC Bank" },
      {
        name: "accountNumber",
        label: "Account number",
        placeholder: "e.g. 50100123454821",
      },
      {
        name: "routingCode",
        label: "IFSC / SWIFT / IBAN / sort code",
        placeholder: "e.g. HDFC0001234",
      },
    ],
    paypal: [
      {
        name: "paypalEmail",
        label: "PayPal email",
        placeholder: "you@example.com",
        inputMode: "email",
      },
    ],
    wise: [
      {
        name: "wiseAccount",
        label: "Wise email or account",
        placeholder: "you@example.com or @yourwisetag",
      },
    ],
    upi: [{ name: "upiId", label: "UPI ID", placeholder: "yourname@okhdfc" }],
  };

export function isPaymentMethodSetUp(
  method: Partial<Record<PaymentFieldName, string | null>> & {
    type: PaymentMethodType;
  },
): boolean {
  return PAYMENT_METHOD_FIELDS[method.type].every((field) =>
    Boolean(method[field.name]?.trim()),
  );
}

/** "•••• 4821" territory: only ever the last four characters. */
export function lastFour(accountNumber: string): string {
  return accountNumber.replace(/\s+/g, "").slice(-4);
}

/**
 * The one-line summary in the settings list. Account numbers are masked
 * here; the full number only appears on the documents a client receives.
 */
export function describePaymentMethod(
  method: PaymentMethodDetails | undefined,
): string {
  if (!method || !isPaymentMethodSetUp(method)) return "Not set up";

  switch (method.type) {
    case "bank":
      return `${method.bankName}, account ending ${lastFour(method.accountNumber ?? "")}`;
    case "paypal":
      return method.paypalEmail ?? "";
    case "wise":
      return method.wiseAccount ?? "";
    case "upi":
      return method.upiId ?? "";
  }
}

/** A method as printed on an invoice: a heading and its detail lines. */
export function formatPaymentMethod(method: PaymentMethodDetails): {
  label: string;
  lines: string[];
} {
  const lines: (string | null)[] =
    method.type === "bank"
      ? [
          method.accountHolder && `Account holder: ${method.accountHolder}`,
          method.bankName && `Bank: ${method.bankName}`,
          method.accountNumber && `Account number: ${method.accountNumber}`,
          method.routingCode && `IFSC / SWIFT / IBAN: ${method.routingCode}`,
        ]
      : method.type === "paypal"
        ? [method.paypalEmail]
        : method.type === "wise"
          ? [method.wiseAccount]
          : [method.upiId];

  return {
    label: PAYMENT_METHOD_LABELS[method.type],
    lines: lines.filter((line): line is string => Boolean(line)),
  };
}

export function hasPaymentDetails(payment: PaymentDetails): boolean {
  return payment.methods.length > 0 || Boolean(payment.instructions?.trim());
}
