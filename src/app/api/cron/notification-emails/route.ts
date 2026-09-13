import { timingSafeEqual } from "node:crypto";
import { deliverNotificationEmails } from "@/lib/email/notifications";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * Sends notification emails nobody's action triggered — mainly the weekly
 * "someone you might connect with" suggestions. Call it every few minutes
 * from a scheduler with `Authorization: Bearer $CRON_SECRET`.
 */
export async function POST(request: Request) {
  if (!authorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const origin = (process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin).replace(/\/+$/, "");
  const result = await deliverNotificationEmails(origin);
  return Response.json(result);
}
