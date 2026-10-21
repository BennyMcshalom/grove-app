import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "./send";
import { messageEmail } from "./templates";

/**
 * Emails people about messages they haven't read (one email per chat until
 * they open it; the rules live in claim_message_emails, migration
 * 20261021100000). Run every minute by /api/cron/message-emails.
 *
 * Claiming moves each chat's emailed_until forward before sending, so
 * overlapping runs never double-send; a send that fails is logged, not retried.
 */
export async function deliverMessageEmails(origin: string): Promise<{ sent: number; failed: number }> {
  // Claiming marks chats as emailed, so don't claim what can't be sent.
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM || !process.env.SUPABASE_SECRET_KEY) {
    return { sent: 0, failed: 0 };
  }

  const admin = createAdminClient();
  let sent = 0;
  let failed = 0;

  for (let batch = 0; batch < 10; batch++) {
    const { data, error } = await admin.rpc("claim_message_emails", { p_limit: 50 });
    if (error) {
      console.error("[email] claiming message emails failed", error);
      break;
    }
    if (!data?.length) break;

    const results = await Promise.allSettled(
      data.map((row) =>
        sendEmail(
          messageEmail({
            to: row.recipient_email,
            recipientName: row.recipient_name,
            conversationKind: row.conversation_kind,
            unreadCount: row.unread_count,
            senderCount: row.sender_count,
            latestSenderId: row.latest_sender_id,
            latestSenderName: row.latest_sender_name,
            latestKind: row.latest_kind,
            latestPreview: row.latest_preview,
            groupSlug: row.group_slug,
            groupTitle: row.group_title,
            eventId: row.event_id,
            eventTitle: row.event_title,
            siteUrl: origin,
          }),
        ),
      ),
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        if (result.value.sent) sent++;
      } else {
        failed++;
        console.error("[email] message email failed", result.reason);
      }
    }
    if (data.length < 50) break;
  }

  return { sent, failed };
}
