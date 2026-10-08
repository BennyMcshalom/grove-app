import { timingSafeEqual } from "node:crypto";
import { purgeDueAccounts } from "@/lib/account-deletion";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * Deletes accounts whose seven-day grace period is over (Settings → Danger
 * zone schedules them; signing back in calls it off). Call it a few times a
 * day from a scheduler with `Authorization: Bearer $CRON_SECRET`.
 */
export async function POST(request: Request) {
  if (!authorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return Response.json(await purgeDueAccounts());
}
