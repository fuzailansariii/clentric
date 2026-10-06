import DodoPayments from "dodopayments";
import { billingEnv } from "./env";
import {
  SUBSCRIPTION_STATUSES,
  type BillingInterval,
  type BillingProvider,
  type NormalizedEvent,
  type SubscriptionStatus,
} from "./types";

// The only file that imports the provider SDK.

let client: DodoPayments | null = null;

function dodo(): DodoPayments {
  if (client) return client;
  const env = billingEnv();
  client = new DodoPayments({
    bearerToken: env.DODO_PAYMENTS_API_KEY,
    // The SDK defaults to live_mode; always pass it explicitly.
    environment: env.DODO_PAYMENTS_ENVIRONMENT,
    timeout: 15_000,
    maxRetries: 1,
  });
  return client;
}

function productFor(interval: BillingInterval): string {
  const env = billingEnv();
  return interval === "monthly"
    ? env.DODO_PRODUCT_PRO_MONTHLY
    : env.DODO_PRODUCT_PRO_YEARLY;
}

function toStatus(value: string): SubscriptionStatus | null {
  return (SUBSCRIPTION_STATUSES as readonly string[]).includes(value)
    ? (value as SubscriptionStatus)
    : null;
}

function toDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export const dodoProvider: BillingProvider = {
  name: "dodo",

  async createCustomer({ email, name, userId }) {
    const customer = await dodo().customers.create({
      email,
      name,
      metadata: { user_id: userId },
    });
    return { customerId: customer.customer_id };
  },

  async createCheckout({ customerId, userId, interval, returnUrl }) {
    const session = await dodo().checkoutSessions.create({
      product_cart: [{ product_id: productFor(interval), quantity: 1 }],
      customer: { customer_id: customerId },
      metadata: { user_id: userId },
      return_url: returnUrl,
    });
    if (!session.checkout_url) throw new Error("Checkout returned no URL.");
    return { url: session.checkout_url };
  },

  async createPortalLink({ customerId, returnUrl }) {
    const session = await dodo().customers.customerPortal.create(customerId, {
      return_url: returnUrl,
    });
    return { url: session.link };
  },

  async cancelAtPeriodEnd(subscriptionId) {
    await dodo().subscriptions.update(subscriptionId, {
      cancel_at_next_billing_date: true,
    });
  },

  verifyWebhook(rawBody, headers) {
    const event = dodo().webhooks.unwrap(rawBody, {
      headers,
      key: billingEnv().DODO_PAYMENTS_WEBHOOK_SECRET,
    });
    return normalizeDodoEvent(headers["webhook-id"] ?? "", event);
  },

  intervalForProduct(productId) {
    const env = billingEnv();
    if (productId === env.DODO_PRODUCT_PRO_MONTHLY) return "monthly";
    if (productId === env.DODO_PRODUCT_PRO_YEARLY) return "yearly";
    return null;
  },
};

type DodoEvent = ReturnType<DodoPayments["webhooks"]["unwrap"]>;

/** Exported for tests. */
export function normalizeDodoEvent(id: string, event: DodoEvent): NormalizedEvent {
  const occurredAt = toDate(event.timestamp) ?? new Date();
  if (!event.type.startsWith("subscription.")) {
    return { id, type: event.type, occurredAt, subscription: null };
  }

  const data = event.data as Extract<DodoEvent, { type: "subscription.active" }>["data"];
  const status = toStatus(data.status);
  if (!status) {
    // A status we don't know yet: keep the event, change no plan.
    console.error(`[billing.webhook] Unknown subscription status: ${data.status}`);
    return { id, type: event.type, occurredAt, subscription: null };
  }
  const metadataUserId = data.metadata?.user_id;

  return {
    id,
    type: event.type,
    occurredAt,
    subscription: {
      customerId: data.customer.customer_id,
      subscriptionId: data.subscription_id,
      productId: data.product_id,
      status,
      cancelAtPeriodEnd: data.cancel_at_next_billing_date,
      currentPeriodEnd: toDate(data.next_billing_date),
      metadataUserId: typeof metadataUserId === "string" ? metadataUserId : null,
    },
  };
}
