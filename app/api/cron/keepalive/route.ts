import { logError } from "@/lib/errors";
import { redis } from "@/lib/write-limit";

// Daily Vercel cron: one Redis write keeps the free Upstash database from
// being archived after 30 quiet days.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized.", { status: 401 });
  }
  if (!redis) return new Response("Upstash not configured.", { status: 200 });

  try {
    await redis.set("clentric:keepalive", new Date().toISOString());
    return new Response("OK", { status: 200 });
  } catch (error) {
    logError("GET /api/cron/keepalive", error);
    return new Response("Upstash unreachable.", { status: 500 });
  }
}
