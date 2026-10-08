// Railway cron service: asks the web service to send queued notification
// emails and to purge accounts whose deletion date has passed, then exits.
// Needs NEXT_PUBLIC_SITE_URL and CRON_SECRET (reference them from the web
// service's variables).
const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
const secret = process.env.CRON_SECRET;

if (!site || !secret) {
  console.error("[cron] NEXT_PUBLIC_SITE_URL and CRON_SECRET must both be set");
  process.exit(1);
}

let ok = true;
// Each job runs on its own, so one failing doesn't hold up the other.
for (const job of ["notification-emails", "account-deletions"]) {
  try {
    const response = await fetch(`${site}/api/cron/${job}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(60_000),
    });
    console.log(`[cron] ${job} ${response.status} ${await response.text()}`);
    ok &&= response.ok;
  } catch (error) {
    console.error(`[cron] ${job} failed`, error);
    ok = false;
  }
}
process.exit(ok ? 0 : 1);
