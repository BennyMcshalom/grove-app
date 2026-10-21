import { timingSafeEqual } from "node:crypto";
import { deliverMessageEmails } from "@/lib/email/messages";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * Emails people about unread messages. The database calls this every minute
 * (pg_cron, migration 20261021100000) with `Authorization: Bearer $CRON_SECRET`.
 */
export async function POST(request: Request) {
  if (!authorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const origin = (process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin).replace(/\/+$/, "");
  const result = await deliverMessageEmails(origin);
  return Response.json(result);
}
