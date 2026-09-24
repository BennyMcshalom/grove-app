import "server-only";
import { messagePreview, type BondPerson, type PendingRequest, type Suggestion } from "@/lib/bonds";
import { createClient } from "@/lib/supabase/server";

/** The viewer's bonds first, then their circle, most recently active first. */
export async function loadBondPeople(): Promise<BondPerson[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("bonds_overview");
  if (error) console.error("[bonds] bonds_overview failed", error);

  return (data ?? []).map((row) => ({
    userId: row.user_id,
    name: row.first_name,
    avatarUrl: row.avatar_url,
    aura: row.aura,
    chapterSlug: row.chapter_slug,
    phase: row.phase,
    relationship: row.relationship,
    bondId: row.bond_id,
    since: row.together_since,
    rank: row.bond_rank,
    conversationId: row.conversation_id,
    lastMessage: row.last_message_at
      ? {
          preview: messagePreview(row.last_message_kind, row.last_message_body),
          at: row.last_message_at,
          fromMe: Boolean(row.last_message_from_me),
        }
      : null,
    unread: row.unread_count,
  }));
}

export async function loadPendingRequests(): Promise<PendingRequest[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("pending_requests");
  if (error) console.error("[bonds] pending_requests failed", error);

  return (data ?? []).map((row) => ({
    kind: row.kind,
    requestId: row.request_id,
    userId: row.user_id,
    name: row.first_name,
    avatarUrl: row.avatar_url,
    chapterSlug: row.chapter_slug,
    phase: row.phase,
  }));
}

export async function loadSuggestions(limit = 6): Promise<Suggestion[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("people_you_may_know", { p_limit: limit });
  if (error) console.error("[bonds] people_you_may_know failed", error);

  return (data ?? []).map((row) => ({
    userId: row.user_id,
    name: row.first_name,
    avatarUrl: row.avatar_url,
    phase: row.phase,
    sharedChapter: row.shared_chapter,
    mutualCount: row.mutual_count,
    mutualAvatars: row.mutual_avatars,
  }));
}
