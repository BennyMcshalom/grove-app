"use server";

import { requireOnboardedViewer } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

/** A message in a group or event conversation, with who wrote it. */
export interface RoomMessage {
  id: string;
  kind: "text" | "system" | string;
  body: string | null;
  createdAt: string;
  senderId: string | null;
  senderName: string | null;
  senderAvatar: string | null;
  mine: boolean;
}

const COLUMNS = "id, kind, body, created_at, sender_id, sender:profiles!messages_sender_id_fkey(first_name, avatar_url)";

type Row = {
  id: string;
  kind: string;
  body: string | null;
  created_at: string;
  sender_id: string | null;
  sender: { first_name: string; avatar_url: string | null } | null;
};

function toRoomMessage(row: Row, viewerId: string): RoomMessage {
  return {
    id: row.id,
    kind: row.kind,
    body: row.body,
    createdAt: row.created_at,
    senderId: row.sender_id,
    senderName: row.sender?.first_name ?? null,
    senderAvatar: row.sender?.avatar_url ?? null,
    mine: row.sender_id === viewerId,
  };
}

/** The latest 150 messages, oldest first. Empty when the viewer isn't a member. */
export async function loadRoomMessages(conversationId: string): Promise<RoomMessage[]> {
  const viewer = await requireOnboardedViewer();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("messages")
    .select(COLUMNS)
    .eq("conversation_id", conversationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(150);

  if (error) console.error("[rooms] loadRoomMessages failed", error);
  return ((data ?? []) as Row[]).reverse().map((row) => toRoomMessage(row, viewer.userId));
}

export async function loadRoomMessage(messageId: string): Promise<RoomMessage | null> {
  const viewer = await requireOnboardedViewer();
  const supabase = await createClient();
  const { data } = await supabase.from("messages").select(COLUMNS).eq("id", messageId).maybeSingle();
  return data ? toRoomMessage(data as Row, viewer.userId) : null;
}

export async function sendRoomMessage(
  conversationId: string,
  body: string,
): Promise<{ message?: RoomMessage; error?: string }> {
  const viewer = await requireOnboardedViewer();
  const text = body.trim();
  if (!text) return { error: "Write a message first." };
  if (text.length > 4000) return { error: "Keep messages under 4,000 characters." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: viewer.userId, body: text })
    .select(COLUMNS)
    .single();

  if (error || !data) {
    if (error?.code === "42501") return { error: "Join first to take part in this conversation." };
    console.error("[rooms] sendRoomMessage failed", error);
    if (error?.hint === "rate_limited") return { error: error.message };
    return { error: "Your message didn't send. Try again." };
  }

  // Keep the sender's read marker current so their own messages aren't unread.
  await supabase
    .from("conversation_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", viewer.userId);

  return { message: toRoomMessage(data as Row, viewer.userId) };
}
