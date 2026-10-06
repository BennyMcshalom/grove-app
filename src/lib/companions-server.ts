import "server-only";
import type {
  CompanionChapter,
  CompanionInvitation,
  OwnerCompanion,
  PickableMoment,
  SentInvite,
  WalkingWith,
} from "@/lib/invites";
import { loadMyLogEntries } from "@/lib/log-server";
import { signPaths } from "@/lib/storage-server";
import { createClient } from "@/lib/supabase/server";

/**
 * Chapter Companions, read on the server. Every read for a companion goes
 * through a security definer function that checks the relationship is live,
 * and only the photos those functions return are ever signed.
 */

const DAY_MS = 86_400_000;

/** The invitation behind a link. Works signed out (counts only, no moments). */
export async function loadInvitationCard(token: string): Promise<CompanionInvitation | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("companion_invite_card", { p_token: token });
  if (error) console.error("[companions] companion_invite_card failed", error);
  const row = data?.[0];
  if (!row) return null;
  return {
    id: row.id,
    token,
    senderId: row.sender_id,
    senderName: row.sender_name,
    senderAvatar: row.sender_avatar,
    chapterSlug: row.chapter_slug,
    phase: row.phase,
    title: row.title,
    why: row.why,
    ask: row.ask,
    share: { story: row.share_story, current: row.share_current, future: row.share_future },
    momentCount: row.moment_count,
    isSender: row.is_sender,
    forSomeoneElse: row.for_someone_else,
    taken: row.taken,
    myStatus: row.my_status,
    myCompanionId: row.my_companion_id,
  };
}

/**
 * The owner's own moments from one chapter, newest first: its Grouv Log
 * entries and the posts they made there under their name.
 */
export async function loadPickableMoments(
  userId: string,
  userChapter: { id: string; chapterSlug: string; openedAt: string },
): Promise<PickableMoment[]> {
  const supabase = await createClient();
  const [logs, { data: posts, error }] = await Promise.all([
    loadMyLogEntries(userId, { userChapterId: userChapter.id, limit: 90 }),
    supabase
      .from("posts")
      .select("id, title, body, created_at")
      .eq("author_id", userId)
      .eq("chapter_slug", userChapter.chapterSlug)
      .eq("is_anonymous", false)
      .order("created_at", { ascending: false })
      .limit(60),
  ]);
  if (error) console.error("[companions] loading own posts failed", error);

  const postRows = posts ?? [];
  const { data: media } = postRows.length
    ? await supabase
        .from("post_media")
        .select("post_id, kind, storage_path, position")
        .in("post_id", postRows.map((p) => p.id))
        .eq("kind", "photo")
        .order("position")
    : { data: [] };
  const firstPhoto = new Map<string, string>();
  for (const m of media ?? []) if (!firstPhoto.has(m.post_id)) firstPhoto.set(m.post_id, m.storage_path);
  const signed = await signPaths("media", [...firstPhoto.values()], { width: 900 });

  const opened = new Date(userChapter.openedAt);
  const openedDay = Date.UTC(opened.getUTCFullYear(), opened.getUTCMonth(), opened.getUTCDate());
  const fromPosts: PickableMoment[] = postRows.map((p) => {
    const day = p.created_at.slice(0, 10);
    const path = firstPhoto.get(p.id);
    return {
      kind: "post",
      id: p.id,
      body: [p.title, p.body].filter(Boolean).join("\n\n") || null,
      photoUrl: path ? (signed.get(path) ?? null) : null,
      entryDate: day,
      dayNumber: Math.max(1, Math.floor((Date.parse(`${day}T00:00:00Z`) - openedDay) / DAY_MS) + 1),
      chapterSlug: userChapter.chapterSlug,
      scope: "solo",
    };
  });

  return [...logs.map((l) => ({ ...l, kind: "log" as const })), ...fromPosts]
    .filter((m) => m.body || m.photoUrl)
    .sort((a, b) => b.entryDate.localeCompare(a.entryDate));
}

/** "Chapters I'm walking with". */
export async function loadWalkingWith(): Promise<WalkingWith[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("walking_with");
  if (error) console.error("[companions] walking_with failed", error);
  return (data ?? []).map((r) => ({
    companionId: r.companion_id,
    ownerId: r.owner_id,
    ownerName: r.owner_name,
    ownerAvatar: r.owner_avatar,
    chapterSlug: r.chapter_slug,
    phase: r.phase,
    title: r.title,
    milestone: r.milestone,
    milestoneDate: r.milestone_date,
    latestUpdate: r.latest_update,
    latestUpdateAt: r.latest_update_at,
    muted: r.muted,
    since: r.since,
  }));
}

/** A shared chapter with its moments, updates and thread — or null without access. */
export async function loadCompanionChapter(companionId: string): Promise<CompanionChapter | null> {
  const supabase = await createClient();
  const [detail, moments, updates, thread] = await Promise.all([
    supabase.rpc("companion_detail", { p_companion_id: companionId }),
    supabase.rpc("companion_moments", { p_companion_id: companionId }),
    supabase.rpc("companion_shared_updates", { p_companion_id: companionId }),
    supabase.rpc("companion_thread", { p_companion_id: companionId }),
  ]);
  for (const r of [detail, moments, updates, thread]) {
    if (r.error) console.error("[companions] loading a shared chapter failed", r.error);
  }
  const d = detail.data?.[0];
  if (!d) return null;

  const momentRows = moments.data ?? [];
  const updateRows = updates.data ?? [];
  const signed = await signPaths(
    "media",
    [...momentRows.map((m) => m.photo_path), ...updateRows.map((u) => u.photo_path)],
    { width: 900 },
  );

  return {
    companionId: d.companion_id,
    userChapterId: d.user_chapter_id,
    ownerId: d.owner_id,
    ownerName: d.owner_name,
    ownerAvatar: d.owner_avatar,
    companionUserId: d.companion_user_id,
    companionName: d.companion_name,
    companionAvatar: d.companion_avatar,
    chapterSlug: d.chapter_slug,
    phase: d.phase,
    title: d.title,
    why: d.why,
    ask: d.ask,
    share: { story: d.share_story, current: d.share_current, future: d.share_future },
    whereNow: d.where_now,
    milestone: d.milestone,
    milestoneDate: d.milestone_date,
    noteUpdatedAt: d.note_updated_at,
    muted: d.muted,
    isOwner: d.is_owner,
    since: d.since,
    moments: momentRows.map((m) => ({
      kind: m.kind,
      id: m.id,
      body: m.body,
      photoUrl: m.photo_path ? (signed.get(m.photo_path) ?? null) : null,
      entryDate: m.entry_date,
      dayNumber: m.day_number,
      chapterSlug: d.chapter_slug,
      scope: "solo",
    })),
    updates: updateRows.map((u) => ({
      id: u.id,
      body: u.body,
      photoUrl: u.photo_path ? (signed.get(u.photo_path) ?? null) : null,
      createdAt: u.created_at,
    })),
    thread: (thread.data ?? []).map((m) => ({
      id: m.id,
      authorId: m.author_id,
      authorName: m.author_name,
      authorAvatar: m.author_avatar,
      body: m.body,
      createdAt: m.created_at,
    })),
  };
}

/** The owner's Companions section: who walks with this chapter, and invitations still out. */
export async function loadOwnerCompanions(
  userChapterId: string,
): Promise<{ companions: OwnerCompanion[]; invites: SentInvite[] }> {
  const supabase = await createClient();
  const [list, pending] = await Promise.all([
    supabase.rpc("chapter_companion_list", { p_user_chapter_id: userChapterId }),
    supabase.rpc("chapter_pending_invites", { p_user_chapter_id: userChapterId }),
  ]);
  if (list.error) console.error("[companions] chapter_companion_list failed", list.error);
  if (pending.error) console.error("[companions] chapter_pending_invites failed", pending.error);
  return {
    companions: (list.data ?? []).map((r) => ({
      companionId: r.companion_id,
      userId: r.user_id,
      name: r.name,
      avatarUrl: r.avatar_url,
      since: r.since,
      share: { story: r.share_story, current: r.share_current, future: r.share_future },
      momentCount: r.moment_count,
      lastMessage: r.last_message,
      lastMessageAt: r.last_message_at,
      lastMessageMine: Boolean(r.last_message_mine),
    })),
    invites: (pending.data ?? []).map((r) => ({
      id: r.id,
      token: r.token,
      recipientId: r.recipient_id,
      recipientName: r.recipient_name,
      recipientAvatar: r.recipient_avatar,
      createdAt: r.created_at,
    })),
  };
}

/** The chapter's current note, for prefilling the invitation and the owner's editor. */
export async function loadCompanionNote(userChapterId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("companion_chapter_notes")
    .select("where_now, milestone, milestone_date")
    .eq("user_chapter_id", userChapterId)
    .maybeSingle();
  return {
    whereNow: data?.where_now ?? "",
    milestone: data?.milestone ?? "",
    milestoneDate: data?.milestone_date ?? "",
  };
}
