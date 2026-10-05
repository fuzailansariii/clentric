import { createHmac, randomBytes } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";

const secretBytes = randomBytes(24);
const SECRET = `whsec_${secretBytes.toString("base64")}`;

beforeAll(() => {
  Object.assign(process.env, {
    DODO_PAYMENTS_API_KEY: "test_key",
    DODO_PAYMENTS_ENVIRONMENT: "test_mode",
    DODO_PRODUCT_PRO_MONTHLY: "pdt_monthly",
    DODO_PRODUCT_PRO_YEARLY: "pdt_yearly",
    DODO_PAYMENTS_WEBHOOK_SECRET: SECRET,
    APP_URL: "http://localhost:3000",
  });
});

// Standard Webhooks: base64 HMAC-SHA256 of "id.timestamp.body".
function sign(body: string, id = "msg_1", at = Math.floor(Date.now() / 1000), key = secretBytes) {
  const signature = createHmac("sha256", key).update(`${id}.${at}.${body}`).digest("base64");
  return {
    "webhook-id": id,
    "webhook-timestamp": String(at),
    "webhook-signature": `v1,${signature}`,
  };
}

const subscriptionEvent = (status: string) =>
  JSON.stringify({
    business_id: "bus_1",
    type: "subscription.active",
    timestamp: "2026-11-01T10:00:00Z",
    data: {
      subscription_id: "sub_1",
      product_id: "pdt_yearly",
      status,
      cancel_at_next_billing_date: false,
      next_billing_date: "2027-11-01T10:00:00Z",
      customer: { customer_id: "cus_1", email: "a@b.co", name: "A" },
      metadata: { user_id: "11111111-1111-1111-1111-111111111111" },
    },
  });

describe("verifyWebhook", async () => {
  const { dodoProvider } = await import("./dodo");

  it("accepts a correctly signed event and normalizes it", () => {
    const body = subscriptionEvent("active");
    const event = dodoProvider.verifyWebhook(body, sign(body));
    expect(event).toMatchObject({
      id: "msg_1",
      type: "subscription.active",
      subscription: {
        customerId: "cus_1",
        subscriptionId: "sub_1",
        status: "active",
        metadataUserId: "11111111-1111-1111-1111-111111111111",
      },
    });
    expect(event.subscription?.currentPeriodEnd?.toISOString()).toBe("2027-11-01T10:00:00.000Z");
    expect(dodoProvider.intervalForProduct("pdt_yearly")).toBe("yearly");
  });

  it("rejects a changed body, a wrong key and an old timestamp", () => {
    const body = subscriptionEvent("active");
    const headers = sign(body);
    expect(() => dodoProvider.verifyWebhook(body.replace("active", "expired"), headers)).toThrow();
    expect(() => dodoProvider.verifyWebhook(body, sign(body, "msg_1", undefined, randomBytes(24)))).toThrow();
    const hourAgo = Math.floor(Date.now() / 1000) - 3600;
    expect(() => dodoProvider.verifyWebhook(body, sign(body, "msg_1", hourAgo))).toThrow();
  });

  it("keeps an unknown status as a plain event, changing no plan", () => {
    const body = subscriptionEvent("something_new");
    expect(dodoProvider.verifyWebhook(body, sign(body)).subscription).toBeNull();
  });
});
