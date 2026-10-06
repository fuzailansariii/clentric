import { after } from "next/server";
import { applyBillingEvent, billing, billingEnv } from "@/lib/billing";
import { logError } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // The signature covers the exact bytes, so read the body before parsing it.
  const rawBody = await request.text();
  const headers = {
    "webhook-id": request.headers.get("webhook-id") ?? "",
    "webhook-signature": request.headers.get("webhook-signature") ?? "",
    "webhook-timestamp": request.headers.get("webhook-timestamp") ?? "",
  };

  try {
    // Misconfigured host: 500 so the provider keeps retrying until it's fixed.
    if (!billingEnv().DODO_PAYMENTS_WEBHOOK_SECRET) {
      throw new Error("DODO_PAYMENTS_WEBHOOK_SECRET is empty.");
    }
  } catch (error) {
    logError("billing.webhook", error);
    return new Response("Error", { status: 500 });
  }

  let event;
  try {
    event = billing.verifyWebhook(rawBody, headers);
  } catch {
    // Wrong or missing signature, or a stale timestamp: change nothing.
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const { toCancel } = await applyBillingEvent(event, billing);
    // Provider calls happen after the reply, outside the database transaction.
    if (toCancel.length) {
      after(async () => {
        for (const id of toCancel) {
          await billing.cancelAtPeriodEnd(id).catch((error) =>
            logError(`billing.webhook cancel ${id}`, error),
          );
        }
      });
    }
    return new Response("OK", { status: 200 });
  } catch (error) {
    // Database trouble: 500 so the provider retries; the event rolled back.
    logError("billing.webhook", error);
    return new Response("Error", { status: 500 });
  }
}
