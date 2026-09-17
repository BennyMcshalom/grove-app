import { createHmac, timingSafeEqual } from "node:crypto";
import { billingEnabled, syncBilling } from "@/lib/revenuecat";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** `X-RevenueCat-Webhook-Signature: t=<unix>,v1=<hex HMAC-SHA256 of "t.body">`, within 5 minutes. */
function validSignature(header: string | null, body: string, secret: string) {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(",").map((part) => part.trim().split("=") as [string, string]));
  const timestamp = Number(parts.t);
  if (!parts.v1 || !Number.isFinite(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${parts.t}.${body}`).digest("hex");
  return safeEqual(parts.v1, expected);
}

interface RevenueCatEvent {
  type: string;
  app_user_id?: string;
  original_app_user_id?: string;
  aliases?: string[];
  transferred_from?: string[];
  transferred_to?: string[];
}

/**
 * RevenueCat → Supabase. Every event is only a nudge: the person's plan is
 * re-read from RevenueCat and saved, so retries and out-of-order deliveries
 * can't leave a stale status. Add this URL under Integrations → Webhooks.
 */
export async function POST(request: Request) {
  const expectedAuth = process.env.REVENUECAT_WEBHOOK_AUTH;
  if (!billingEnabled() || !expectedAuth) {
    return Response.json({ error: "Webhook not configured" }, { status: 400 });
  }

  const body = await request.text();
  if (!safeEqual(request.headers.get("authorization") ?? "", expectedAuth)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const signingSecret = process.env.REVENUECAT_WEBHOOK_SIGNING_SECRET;
  if (signingSecret && !validSignature(request.headers.get("x-revenuecat-webhook-signature"), body, signingSecret)) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: RevenueCatEvent;
  try {
    event = (JSON.parse(body) as { event: RevenueCatEvent }).event;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!event?.type) return Response.json({ error: "No event" }, { status: 400 });
  if (event.type === "TEST") return Response.json({ received: true });

  // Our app user ids are Supabase user ids; anonymous RevenueCat ids are skipped.
  const userIds = new Set(
    [
      event.app_user_id,
      event.original_app_user_id,
      ...(event.aliases ?? []),
      ...(event.transferred_from ?? []),
      ...(event.transferred_to ?? []),
    ].filter((id): id is string => typeof id === "string" && UUID.test(id)),
  );

  try {
    for (const userId of userIds) await syncBilling(userId);
  } catch (error) {
    // A non-200 makes RevenueCat retry (5, 10, 20, 40 and 80 minutes later).
    console.error(`[billing] handling ${event.type} failed`, error);
    return Response.json({ error: "Handler failed" }, { status: 500 });
  }

  return Response.json({ received: true });
}
