"use server";

import { requireOnboardedViewer } from "@/lib/auth/viewer";
import { toInboxItem, type InboxItem } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";

export async function loadNotifications(): Promise<InboxItem[]> {
  await requireOnboardedViewer();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_notifications", { p_limit: 50 });
  if (error) console.error("[notifications] my_notifications failed", error);
  return (data ?? []).map(toInboxItem);
}

/** Opening the panel reads everything in it. */
export async function markNotificationsRead(): Promise<void> {
  const viewer = await requireOnboardedViewer();
  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", viewer.userId)
    .is("read_at", null);
}

/** The Bonds badge: unread direct messages, and who sent the latest. */
export async function loadUnreadMessages(): Promise<{ unread: number; latestSender: string | null }> {
  await requireOnboardedViewer();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_unread_messages");
  if (error) console.error("[notifications] my_unread_messages failed", error);
  const row = data?.[0];
  return { unread: row?.unread ?? 0, latestSender: row?.latest_sender ?? null };
}

/** A bond opened a new chapter → "Acknowledge". */
export async function acknowledgeChapter(notificationId: string): Promise<{ error?: string }> {
  await requireOnboardedViewer();
  const supabase = await createClient();
  const { error } = await supabase.rpc("acknowledge_chapter", { p_notification_id: notificationId });
  if (error) {
    console.error("[notifications] acknowledge_chapter failed", error);
    return { error: "That's no longer there." };
  }
  return {};
}

/** Dismiss a one-time prompt. A dismissed dormancy nudge never returns for that pair. */
export async function dismissNotification(notificationId: string): Promise<{ error?: string }> {
  const viewer = await requireOnboardedViewer();
  const supabase = await createClient();
  const { error } = await supabase.from("notifications").delete().eq("id", notificationId).eq("user_id", viewer.userId);
  if (error) return { error: "We couldn't dismiss that. Try again." };
  return {};
}

/** "Clear Notifications". */
export async function clearNotifications(): Promise<{ error?: string }> {
  const viewer = await requireOnboardedViewer();
  const supabase = await createClient();
  const { error } = await supabase.from("notifications").delete().eq("user_id", viewer.userId);
  if (error) return { error: "We couldn't clear your notifications. Try again." };
  return {};
}
