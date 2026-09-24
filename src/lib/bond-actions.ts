"use server";

import { refresh } from "next/cache";
import { requireOnboardedViewer } from "@/lib/auth/viewer";
import type { BondPerson, ChatMessage, DailyCard, Suggestion } from "@/lib/bonds";
import { loadBondPeople, loadSuggestions } from "@/lib/bonds-server";
import { signPaths } from "@/lib/storage-server";
import { sendNotificationEmailsSoon } from "@/lib/email/notifications";
import { createClient } from "@/lib/supabase/server";

type Result = { error?: string };

/** The feed rail's "Your circle", "Active bonds" and "Suggested for you". */
export async function loadRail(): Promise<{ people: BondPerson[]; suggestions: Suggestion[] }> {
  await requireOnboardedViewer();
  const [people, suggestions] = await Promise.all([loadBondPeople(), loadSuggestions(3)]);
  return { people, suggestions };
}

/**
 * Pending connection → Accept / Decline. Bonds are never requested: the bond
 * engine forms them from the connection itself.
 */
export async function respondToRequest(requestId: string, accept: boolean): Promise<Result> {
  await requireOnboardedViewer();
  const supabase = await createClient();

  const { error } = await supabase.rpc("respond_to_connection", { p_connection_id: requestId, p_accept: accept });

  if (error) {
    console.error("[bonds] respondToRequest failed", error);
    if (error?.hint === "rate_limited") return { error: error.message };
    return { error: "That request is no longer waiting on you." };
  }

  refresh();
  return {};
}

/** Introduce two people in your circle to each other. */
export async function introducePeople(userA: string, userB: string, note: string): Promise<Result> {
  await requireOnboardedViewer();
  const supabase = await createClient();
  const { error } = await supabase.rpc("introduce", {
    p_user_a: userA,
    p_user_b: userB,
    p_note: note.trim() || null,
  });
  if (error) {
    if (error.hint === "already_connected") return { error: "They already know each other." };
    if (error.hint === "already_introduced") return { error: "You've already introduced them." };
    if (error.hint === "not_in_circle") return { error: "You can only introduce people in your circle." };
    console.error("[bonds] introduce failed", error);
    return { error: "We couldn't send that introduction. Try again." };
  }
  await sendNotificationEmailsSoon();
  return {};
}

/** "Invited" → take a connection request back before it's answered. */
export async function cancelConnectionRequest(userId: string): Promise<Result> {
  const viewer = await requireOnboardedViewer();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("connections")
    .delete()
    .eq("requester_id", viewer.userId)
    .eq("addressee_id", userId)
    .eq("status", "pending")
    .select("id");
  if (error) {
    console.error("[bonds] cancelConnectionRequest failed", error);
    return { error: "We couldn't cancel that request. Try again." };
  }
  if (!data?.length) return { error: "That request was already answered." };
  return {};
}

/** Chat menu / profile → "Remove from circle". Ends a bond with them too. */
export async function removeFromCircle(userId: string): Promise<Result> {
  const viewer = await requireOnboardedViewer();
  const supabase = await createClient();
  const { error } = await supabase
    .from("connections")
    .delete()
    .or(
      `and(requester_id.eq.${viewer.userId},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${viewer.userId})`,
    );
  if (error) {
    console.error("[bonds] removeFromCircle failed", error);
    return { error: "We couldn't remove them. Try again." };
  }
  refresh();
  return {};
}

/** Block: no messages, calls, requests or Nearby either way. */
export async function blockUser(userId: string): Promise<Result> {
  await requireOnboardedViewer();
  const supabase = await createClient();
  const { error } = await supabase.rpc("block_user", { p_user_id: userId });
  if (error) {
    console.error("[bonds] block_user failed", error);
    return { error: "We couldn't block them. Try again." };
  }
  refresh();
  return {};
}

export async function unblockUser(userId: string): Promise<Result> {
  await requireOnboardedViewer();
  const supabase = await createClient();
  const { error } = await supabase.rpc("unblock_user", { p_user_id: userId });
  if (error) return { error: "We couldn't unblock them. Try again." };
  refresh();
  return {};
}

/** Whether the viewer has muted a chat. */
export async function chatMuted(conversationId: string): Promise<boolean> {
  const viewer = await requireOnboardedViewer();
  const supabase = await createClient();
  const { data } = await supabase
    .from("conversation_members")
    .select("muted")
    .eq("conversation_id", conversationId)
    .eq("user_id", viewer.userId)
    .maybeSingle();
  return data?.muted ?? false;
}

/** Mute: no badge or toast from this chat. */
export async function setChatMuted(conversationId: string, muted: boolean): Promise<Result> {
  await requireOnboardedViewer();
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_chat_muted", { p_conversation_id: conversationId, p_muted: muted });
  if (error) return { error: "That didn't go through. Try again." };
  return {};
}

/** People you might know → Connect (or accepts their request if they asked first). */
export async function connectWith(
  userId: string,
): Promise<Result & { status?: "pending" | "accepted" | "declined" }> {
  await requireOnboardedViewer();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("request_connection", { p_other: userId });

  if (error || !data) {
    console.error("[bonds] connectWith failed", error);
    if (error?.hint === "rate_limited") return { error: error.message };
    return { error: "We couldn't send that request. Try again." };
  }
  if (data.status === "accepted") refresh();
  if (data.status === "pending") await sendNotificationEmailsSoon();
  return { status: data.status };
}

const MESSAGE_COLUMNS =
  "id, sender_id, kind, body, media_path, duration_seconds, file_name, file_size, created_at, shared_post:posts!messages_shared_post_id_fkey(id, title, body, chapter_slug), card:content_cards!messages_card_id_fkey(kind, title, body)";

type MessageRow = {
  id: string;
  sender_id: string | null;
  kind: ChatMessage["kind"];
  body: string | null;
  media_path: string | null;
  duration_seconds: number | null;
  file_name: string | null;
  file_size: number | null;
  created_at: string;
  shared_post: { id: string; title: string | null; body: string | null; chapter_slug: string } | null;
  card: { kind: "curio" | "wander"; title: string; body: string } | null;
};

async function toChatMessages(rows: MessageRow[], viewerId: string): Promise<ChatMessage[]> {
  const signed = await signPaths("chat", rows.map((row) => row.media_path));
  return rows.map((row) => toChatMessage(row, viewerId, signed));
}

function toChatMessage(row: MessageRow, viewerId: string, signed: Map<string, string>): ChatMessage {
  return {
    id: row.id,
    kind: row.kind,
    fromMe: row.sender_id === viewerId,
    body: row.body,
    createdAt: row.created_at,
    mediaUrl: row.media_path ? (signed.get(row.media_path) ?? null) : undefined,
    durationSeconds: row.duration_seconds,
    file: row.kind === "file" ? { name: row.file_name ?? "Document", size: row.file_size } : undefined,
    sharedPost:
      row.kind === "post_share"
        ? row.shared_post
          ? {
              id: row.shared_post.id,
              title: row.shared_post.title,
              body: row.shared_post.body,
              chapterSlug: row.shared_post.chapter_slug,
            }
          : null
        : undefined,
    card: row.kind === "card" ? row.card : undefined,
  };
}

/** The latest 100 messages of a conversation, oldest first. */
export async function loadMessages(
  conversationId: string,
): Promise<{ messages: ChatMessage[]; otherReadAt: string | null; error?: string }> {
  const viewer = await requireOnboardedViewer();
  const supabase = await createClient();

  const [{ data, error }, { data: other }] = await Promise.all([
    supabase
      .from("messages")
      .select(MESSAGE_COLUMNS)
      .eq("conversation_id", conversationId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("conversation_members")
      .select("last_read_at")
      .eq("conversation_id", conversationId)
      .neq("user_id", viewer.userId)
      .maybeSingle(),
  ]);

  if (error) {
    console.error("[bonds] loadMessages failed", error);
    return { messages: [], otherReadAt: null, error: "We couldn't load this conversation." };
  }

  return {
    messages: await toChatMessages(((data ?? []) as MessageRow[]).reverse(), viewer.userId),
    otherReadAt: other?.last_read_at ?? null,
  };
}

/** A single message, for Realtime inserts that need a shared post or media joined. */
export async function loadMessage(messageId: string): Promise<ChatMessage | null> {
  const viewer = await requireOnboardedViewer();
  const supabase = await createClient();
  const { data } = await supabase.from("messages").select(MESSAGE_COLUMNS).eq("id", messageId).maybeSingle();
  if (!data) return null;
  const [message] = await toChatMessages([data as MessageRow], viewer.userId);
  return message;
}

async function openConversation(otherUserId: string, conversationId: string | null) {
  if (conversationId) return { conversationId };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("open_direct_conversation", { p_other: otherUserId });
  if (error || !data) {
    return {
      error:
        error?.hint === "not_connected"
          ? "You can only message people in your circle."
          : "We couldn't start this conversation. Try again.",
    };
  }
  return { conversationId: data };
}

/** Before an attachment uploads it needs the conversation's folder. */
export async function ensureConversation(
  otherUserId: string,
  conversationId: string | null,
): Promise<Result & { conversationId?: string }> {
  await requireOnboardedViewer();
  return openConversation(otherUserId, conversationId);
}

/** Sends a voice note, video or photo that's already in the chat bucket. */
export async function sendMediaMessage(
  conversationId: string,
  kind: "voice" | "video" | "image" | "file",
  mediaPath: string,
  durationSeconds: number | null,
  /** Documents: the name to show and its size. */
  file?: { name: string; size: number },
): Promise<Result & { message?: ChatMessage }> {
  const viewer = await requireOnboardedViewer();
  if (!mediaPath.startsWith(`${conversationId}/${viewer.userId}/`)) {
    return { error: "That file didn't finish uploading." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: viewer.userId,
      kind,
      media_path: mediaPath,
      duration_seconds: durationSeconds,
      file_name: kind === "file" ? (file?.name.slice(0, 255) ?? "Document") : null,
      file_size: kind === "file" ? (file?.size ?? null) : null,
    })
    .select(MESSAGE_COLUMNS)
    .single();

  if (error || !data) {
    await supabase.storage.from("chat").remove([mediaPath]);
    console.error("[bonds] sendMediaMessage failed", error);
    if (error?.hint === "rate_limited") return { error: error.message };
    return { error: "That didn't send. Try again." };
  }

  const [message] = await toChatMessages([data as MessageRow], viewer.userId);
  return { message };
}

/**
 * Sends a text message. The first message to someone opens the conversation,
 * which is why this takes the other person as well as the conversation.
 */
export async function sendMessage(
  otherUserId: string,
  conversationId: string | null,
  body: string,
): Promise<Result & { message?: ChatMessage; conversationId?: string }> {
  const viewer = await requireOnboardedViewer();
  const text = body.trim();
  if (!text) return { error: "Write a message first." };
  if (text.length > 4000) return { error: "Keep messages under 4,000 characters." };

  const opened = await openConversation(otherUserId, conversationId);
  if (opened.error || !opened.conversationId) return { error: opened.error };
  const conversation = opened.conversationId;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversation, sender_id: viewer.userId, body: text })
    .select(MESSAGE_COLUMNS)
    .single();

  if (error || !data) {
    console.error("[bonds] sendMessage failed", error);
    if (error?.hint === "rate_limited") return { error: error.message };
    return { error: "Your message didn't send. Try again." };
  }

  const [message] = await toChatMessages([data as MessageRow], viewer.userId);
  return { message, conversationId: conversation };
}

export async function markConversationRead(conversationId: string): Promise<void> {
  const viewer = await requireOnboardedViewer();
  const supabase = await createClient();
  await supabase
    .from("conversation_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", viewer.userId);
}

/** Today's Curio and Wander cards (expire at noon local). */
export async function loadDailyCards(): Promise<DailyCard[]> {
  await requireOnboardedViewer();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_daily_cards");
  if (error) console.error("[cards] my_daily_cards failed", error);
  return (data ?? []).map((row) => ({
    cardId: row.card_id,
    kind: row.kind,
    chapterSlug: row.chapter_slug,
    title: row.title,
    body: row.body,
  }));
}

/** A card can go to anyone you're connected with, bond or circle. */
export async function listCardTargets(): Promise<{ userId: string; name: string; avatarUrl: string | null }[]> {
  await requireOnboardedViewer();
  const people = await loadBondPeople();
  return people.map(({ userId, name, avatarUrl }) => ({ userId, name, avatarUrl }));
}

/** Send a Curio or Wander card privately, as a chat message. */
export async function sendCard(cardId: string, userId: string): Promise<Result> {
  const viewer = await requireOnboardedViewer();
  const supabase = await createClient();
  const { data: conversation, error: openError } = await supabase.rpc("open_direct_conversation", { p_other: userId });
  if (openError || !conversation) return { error: "You can only send cards to people in your circle." };

  const { error } = await supabase.from("messages").insert({
    conversation_id: conversation,
    sender_id: viewer.userId,
    kind: "card",
    card_id: cardId,
  });
  if (error) {
    console.error("[cards] sendCard failed", error);
    if (error?.hint === "rate_limited") return { error: error.message };
    return { error: "We couldn't send that card. Try again." };
  }
  return {};
}

/** Post menu → "Send to a Bond": the bonds to choose from. */
export async function listShareTargets(): Promise<
  { userId: string; name: string; avatarUrl: string | null }[]
> {
  await requireOnboardedViewer();
  const people = await loadBondPeople();
  return people
    .filter((p) => p.relationship === "bond")
    .map(({ userId, name, avatarUrl }) => ({ userId, name, avatarUrl }));
}

export async function sendPostToBond(postId: string, userId: string): Promise<Result> {
  const viewer = await requireOnboardedViewer();
  const supabase = await createClient();

  const { data: conversation, error: openError } = await supabase.rpc("open_direct_conversation", {
    p_other: userId,
  });
  if (openError || !conversation) {
    return { error: "You can only share with people you're bonded with." };
  }

  const { error } = await supabase.from("messages").insert({
    conversation_id: conversation,
    sender_id: viewer.userId,
    kind: "post_share",
    shared_post_id: postId,
  });

  if (error) {
    console.error("[bonds] sendPostToBond failed", error);
    if (error?.hint === "rate_limited") return { error: error.message };
    return { error: "We couldn't share that post. Try again." };
  }
  return {};
}
