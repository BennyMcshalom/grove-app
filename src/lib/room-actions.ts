"use server";

import { requireOnboardedViewer } from "@/lib/auth/viewer";
import { isUuid } from "@/lib/mentions";
import { createClient } from "@/lib/supabase/server";

/** The message a reply quotes (Figma 1784:37381). */
export interface RoomReply {
  id: string;
  senderName: string | null;
  mine: boolean;
  /** Its words, or a note when it's gone. */
  preview: string;
}

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
  editedAt: string | null;
  /** Removed for everyone; `byModerator` when the host / an admin did it. */
  deleted: null | { byModerator: boolean };
  pinnedAt: string | null;
  replyTo: RoomReply | null;
}

const COLUMNS =
  "id, kind, body, created_at, sender_id, edited_at, deleted_at, deleted_by, pinned_at, " +
  "sender:profiles!messages_sender_id_fkey(first_name, avatar_url), " +
  "reply:messages!reply_to_id(id, body, deleted_at, sender_id, sender:profiles!messages_sender_id_fkey(first_name))";
// What a sender gets back: the row plus who the database kept as mentioned.
const SENT_COLUMNS = `${COLUMNS}, mentions`;

type Row = {
  id: string;
  kind: string;
  body: string | null;
  created_at: string;
  sender_id: string | null;
  edited_at: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
  pinned_at: string | null;
  sender: { first_name: string; avatar_url: string | null } | null;
  reply: {
    id: string;
    body: string | null;
    deleted_at: string | null;
    sender_id: string | null;
    sender: { first_name: string } | null;
  } | null;
};

function toRoomMessage(row: Row, viewerId: string): RoomMessage {
  const reply = row.reply;
  return {
    id: row.id,
    kind: row.kind,
    body: row.deleted_at ? null : row.body,
    createdAt: row.created_at,
    senderId: row.sender_id,
    senderName: row.sender?.first_name ?? null,
    senderAvatar: row.sender?.avatar_url ?? null,
    mine: row.sender_id === viewerId,
    editedAt: row.edited_at,
    deleted: row.deleted_at ? { byModerator: Boolean(row.deleted_by && row.deleted_by !== row.sender_id) } : null,
    pinnedAt: row.deleted_at ? null : row.pinned_at,
    replyTo: reply
      ? {
          id: reply.id,
          senderName: reply.sender?.first_name ?? null,
          mine: reply.sender_id === viewerId,
          preview: reply.deleted_at ? "This message was deleted" : (reply.body ?? "A message"),
        }
      : null,
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
    .order("created_at", { ascending: false })
    .limit(150);

  if (error) console.error("[rooms] loadRoomMessages failed", error);
  return ((data ?? []) as unknown as Row[]).reverse().map((row) => toRoomMessage(row, viewer.userId));
}

export async function loadRoomMessage(messageId: string): Promise<RoomMessage | null> {
  const viewer = await requireOnboardedViewer();
  const supabase = await createClient();
  const { data } = await supabase.from("messages").select(COLUMNS).eq("id", messageId).maybeSingle();
  return data ? toRoomMessage(data as unknown as Row, viewer.userId) : null;
}

/** Whether the viewer hosts this event / admins this group: pin and remove anyone's. */
export async function canModerateRoom(conversationId: string): Promise<boolean> {
  await requireOnboardedViewer();
  if (!isUuid(conversationId)) return false;
  const supabase = await createClient();
  const { data } = await supabase.rpc("can_moderate_conversation", { p_conversation_id: conversationId });
  return data === true;
}

export async function sendRoomMessage(
  conversationId: string,
  body: string,
  /** People picked from the @ list; the database keeps conversation members. */
  mentions: string[] = [],
  /** Reply → the message being answered, quoted above this one. */
  replyToId: string | null = null,
): Promise<{ message?: RoomMessage; mentions?: string[]; error?: string }> {
  const viewer = await requireOnboardedViewer();
  const text = body.trim();
  if (!text) return { error: "Write a message first." };
  if (text.length > 4000) return { error: "Keep messages under 4,000 characters." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: viewer.userId,
      body: text,
      mentions: mentions.filter(isUuid).slice(0, 20),
      reply_to_id: replyToId && isUuid(replyToId) ? replyToId : null,
    })
    .select(SENT_COLUMNS)
    .single();

  if (error || !data) {
    if (error?.code === "42501") return { error: "Join first to take part in this conversation." };
    if (error?.hint === "bad_reply") return { error: error.message };
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

  const row = data as unknown as Row & { mentions: string[] };
  return { message: toRoomMessage(row, viewer.userId), mentions: row.mentions };
}

/** Message menu → Edit (your own). Shared with the Bond chat's check in the database. */
export async function editRoomMessage(messageId: string, body: string): Promise<{ editedAt?: string; error?: string }> {
  await requireOnboardedViewer();
  const text = body.trim();
  if (!text) return { error: "Write a message first." };
  if (text.length > 4000) return { error: "Keep messages under 4,000 characters." };
  if (!isUuid(messageId)) return { error: "That message is no longer here." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("edit_my_message", { p_message: messageId, p_body: text });
  if (error) {
    if (error.hint && ["not_found", "not_sender", "deleted", "not_text", "empty", "too_long"].includes(error.hint)) {
      return { error: error.message };
    }
    console.error("[rooms] edit_my_message failed", error);
    return { error: "We couldn't save that edit. Try again." };
  }
  return { editedAt: data ?? new Date().toISOString() };
}

/** Message menu → Delete: your own, or anyone's when you host. Removed for everyone. */
export async function deleteRoomMessage(messageId: string): Promise<{ error?: string }> {
  await requireOnboardedViewer();
  if (!isUuid(messageId)) return { error: "That message is no longer here." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_room_message", { p_message_id: messageId });
  if (error) {
    if (error.hint === "not_allowed") return { error: "You can only delete your own messages." };
    console.error("[rooms] delete_room_message failed", error);
    return { error: "We couldn't delete that message. Try again." };
  }
  return {};
}

/** Host menu → Pin to top (one per conversation) or unpin. */
export async function pinRoomMessage(messageId: string, pin: boolean): Promise<{ error?: string }> {
  await requireOnboardedViewer();
  if (!isUuid(messageId)) return { error: "That message is no longer here." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("pin_room_message", { p_message_id: messageId, p_pin: pin });
  if (error) {
    if (error.hint === "not_host") return { error: "Only the host can pin messages." };
    if (error.hint === "not_pinnable") return { error: error.message };
    console.error("[rooms] pin_room_message failed", error);
    return { error: "We couldn't pin that message. Try again." };
  }
  return {};
}
