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

/** "Clear Notifications". */
export async function clearNotifications(): Promise<{ error?: string }> {
  const viewer = await requireOnboardedViewer();
  const supabase = await createClient();
  const { error } = await supabase.from("notifications").delete().eq("user_id", viewer.userId);
  if (error) return { error: "We couldn't clear your notifications. Try again." };
  return {};
}
