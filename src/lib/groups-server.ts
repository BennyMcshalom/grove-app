import "server-only";
import type { Group, JoinRequest, Truth, VideoTruth } from "@/lib/groups";
import type { Database } from "@/lib/supabase/database.types";
import { signPaths } from "@/lib/storage-server";
import { createClient } from "@/lib/supabase/server";

type CardRow = Database["public"]["Functions"]["group_cards"]["Returns"][number];

function toGroup(row: CardRow): Group {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    label: row.label,
    description: row.description,
    icon: row.icon,
    color: row.color,
    chapterSlug: row.chapter_slug,
    joinPolicy: row.join_policy,
    memberCount: row.member_count,
    conversationId: row.conversation_id,
    myRole: row.my_role,
    requestPending: row.request_pending,
    memberAvatars: row.member_avatars,
  };
}

export async function loadGroups({
  query = null,
  slug = null,
  suggested = false,
  limit = 50,
}: { query?: string | null; slug?: string | null; suggested?: boolean; limit?: number } = {}): Promise<Group[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("group_cards", {
    p_query: query,
    p_slug: slug,
    p_suggested: suggested,
    p_limit: limit,
  });
  if (error) console.error("[groups] group_cards failed", error);
  return (data ?? []).map(toGroup);
}

export async function loadTruths(groupId: string): Promise<Truth[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("group_truths", { p_group_id: groupId });
  if (error) console.error("[groups] group_truths failed", error);
  return (data ?? []).map((t) => ({
    id: t.id,
    body: t.body,
    feltCount: t.felt_count,
    createdAt: t.created_at,
    feltByMe: t.felt_by_me,
    mine: t.is_mine,
  }));
}

export async function loadVideoTruths(groupId: string, viewerId: string): Promise<VideoTruth[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("video_truths")
    .select("id, storage_path, duration_seconds, author_id, author:profiles!video_truths_author_id_fkey(first_name)")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) console.error("[groups] video_truths failed", error);

  const rows = data ?? [];
  const signed = await signPaths("media", rows.map((r) => r.storage_path));
  return rows.flatMap((row) => {
    const src = signed.get(row.storage_path);
    return src
      ? [
          {
            id: row.id,
            src,
            durationSeconds: row.duration_seconds,
            authorName: row.author?.first_name ?? "Someone",
            mine: row.author_id === viewerId,
          },
        ]
      : [];
  });
}

/** Pending requests an admin can review. */
export async function loadJoinRequests(groupId: string): Promise<JoinRequest[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("group_join_requests")
    .select("id, user_id, created_at, requester:profiles!group_join_requests_user_id_fkey(first_name, avatar_url)")
    .eq("group_id", groupId)
    .eq("status", "pending")
    .order("created_at");
  if (error) console.error("[groups] join requests failed", error);

  return (data ?? []).map((r) => ({
    id: r.id,
    userId: r.user_id,
    name: r.requester?.first_name ?? "Someone",
    avatarUrl: r.requester?.avatar_url ?? null,
    createdAt: r.created_at,
  }));
}
