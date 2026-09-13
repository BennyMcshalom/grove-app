"use server";

import { refresh } from "next/cache";
import { requireOnboardedViewer } from "@/lib/auth/viewer";
import type { BondPerson, ChatMessage, Suggestion } from "@/lib/bonds";
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

/** Pending connection → Accept / Decline, for circle requests and bond invites. */
export async function respondToRequest(
  kind: "connection" | "bond",
  requestId: string,
  accept: boolean,
): Promise<Result> {
  await requireOnboardedViewer();
  const supabase = await createClient();

  const { error } =
    kind === "connection"
      ? await supabase.rpc("respond_to_connection", { p_connection_id: requestId, p_accept: accept })
      : await supabase.rpc("respond_to_bond", { p_bond_id: requestId, p_accept: accept });

  if (error) {
    console.error("[bonds] respondToRequest failed", error);
    if (error?.hint === "rate_limited") return { error: error.message };
    return { error: "That request is no longer waiting on you." };
  }

  refresh();
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
  "id, sender_id, kind, body, media_path, duration_seconds, created_at, shared_post:posts!messages_shared_post_id_fkey(id, title, body, chapter_slug)";

type MessageRow = {
  id: string;
  sender_id: string | null;
  kind: ChatMessage["kind"];
  body: string | null;
  media_path: string | null;
  duration_seconds: number | null;
  created_at: string;
  shared_post: { id: string; title: string | null; body: string | null; chapter_slug: string } | null;
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
  kind: "voice" | "video" | "image",
  mediaPath: string,
  durationSeconds: number | null,
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
