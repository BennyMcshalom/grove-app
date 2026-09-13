import "server-only";
import { after } from "next/server";
import { siteUrl } from "@/lib/site-url";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "./send";
import { notificationEmail } from "./templates";

/**
 * Emails the notifications that are waiting on someone (connection and bond
 * requests, group join requests and decisions, weekly suggestions).
 *
 * Rows are claimed in the database before sending, so overlapping runs never
 * double-send; a send that fails is logged, not retried. Called from `after()`
 * in the actions that create these notifications, and on a schedule from
 * /api/cron/notification-emails for the ones the database creates itself.
 */
export async function deliverNotificationEmails(origin: string): Promise<{ sent: number; failed: number }> {
  // Claiming marks rows as emailed, so don't claim what can't be sent.
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM || !process.env.SUPABASE_SECRET_KEY) {
    return { sent: 0, failed: 0 };
  }

  const admin = createAdminClient();
  let sent = 0;
  let failed = 0;

  for (let batch = 0; batch < 10; batch++) {
    const { data, error } = await admin.rpc("claim_notification_emails", { p_limit: 50 });
    if (error) {
      console.error("[email] claiming notification emails failed", error);
      break;
    }
    if (!data?.length) break;

    const results = await Promise.allSettled(
      data.map((row) => {
        const email = notificationEmail({
          to: row.recipient_email,
          kind: row.kind,
          recipientName: row.recipient_name,
          actorName: row.actor_name,
          entityId: row.entity_id,
          data: (row.data ?? {}) as Record<string, unknown>,
          groupTitle: row.group_title,
          groupSlug: row.group_slug,
          siteUrl: origin,
        });
        return email ? sendEmail(email) : Promise.resolve({ sent: false });
      }),
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        if (result.value.sent) sent++;
      } else {
        failed++;
        console.error("[email] notification email failed", result.reason);
      }
    }
    if (data.length < 50) break;
  }

  return { sent, failed };
}

/** For actions that just created an emailable notification: send after the response. */
export async function sendNotificationEmailsSoon() {
  const origin = await siteUrl();
  after(async () => {
    try {
      await deliverNotificationEmails(origin);
    } catch (error) {
      console.error("[email] delivering notification emails failed", error);
    }
  });
}
