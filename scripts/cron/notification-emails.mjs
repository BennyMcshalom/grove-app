// Railway cron service: asks the web service to send queued notification
// emails, then exits. Needs NEXT_PUBLIC_SITE_URL and CRON_SECRET (reference
// them from the web service's variables).
const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
const secret = process.env.CRON_SECRET;

if (!site || !secret) {
  console.error("[cron] NEXT_PUBLIC_SITE_URL and CRON_SECRET must both be set");
  process.exit(1);
}

const response = await fetch(`${site}/api/cron/notification-emails`, {
  method: "POST",
  headers: { Authorization: `Bearer ${secret}` },
  signal: AbortSignal.timeout(60_000),
});
const body = await response.text();
console.log(`[cron] ${response.status} ${body}`);
process.exit(response.ok ? 0 : 1);
