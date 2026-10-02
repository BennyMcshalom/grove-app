import "server-only";
import {
  messagePreview,
  type BondCheckin,
  type BondDetails,
  type BondInvite,
  type BondLogRound,
  type BondLogSummary,
  type BondPerson,
  type PendingRequest,
  type Suggestion,
} from "@/lib/bonds";
import { signPaths } from "@/lib/storage-server";
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
    origin: row.bond_origin,
    sharedGoal: row.shared_goal,
    goalHorizonMonths: row.goal_horizon_months,
    checkinCount: row.checkin_count ?? 0,
    depthLevel: row.depth_level,
    invite: row.invite_id
      ? { id: row.invite_id, fromMe: Boolean(row.invite_from_me), goal: row.invite_goal }
      : null,
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
    message: row.message,
    prompt: row.prompt,
  }));
}

/** YOUR BOND INVITES: invites waiting on the viewer. */
export async function loadBondInvites(): Promise<BondInvite[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("bond_invites");
  if (error) console.error("[bonds] bond_invites failed", error);

  return (data ?? []).map((row) => ({
    bondId: row.bond_id,
    userId: row.user_id,
    name: row.first_name,
    avatarUrl: row.avatar_url,
    chapterSlug: row.chapter_slug,
    phase: row.phase,
    goal: row.shared_goal,
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

/** One of the viewer's Bonds, active or released; null if it isn't theirs. */
export async function loadBondDetails(bondId: string): Promise<BondDetails | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("bond_details", { p_bond_id: bondId });
  if (error) console.error("[bonds] bond_details failed", error);
  const row = data?.[0];
  if (!row || (row.status !== "active" && row.status !== "released")) return null;

  return {
    bondId: row.bond_id,
    userId: row.user_id,
    name: row.first_name,
    avatarUrl: row.avatar_url,
    chapterSlug: row.chapter_slug,
    phase: row.phase,
    origin: row.origin,
    status: row.status,
    sharedGoal: row.shared_goal,
    goalHorizonMonths: row.goal_horizon_months,
    since: row.since,
    releasedAt: row.released_at,
    endedByMe: Boolean(row.ended_by_me),
    depthLevel: row.depth_level ?? 10,
    checkinCount: row.checkin_count,
    firstCheckinOn: row.first_checkin_on,
    logCount: row.log_count,
  };
}

export async function loadBondCheckins(bondId: string, viewerId: string): Promise<BondCheckin[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bond_checkins")
    .select("id, author_id, mode, body, happened_on")
    .eq("bond_id", bondId)
    .order("happened_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) console.error("[bonds] bond_checkins failed", error);

  return (data ?? []).map((row) => ({
    id: row.id,
    fromMe: row.author_id === viewerId,
    mode: row.mode,
    body: row.body,
    happenedOn: row.happened_on,
  }));
}

/** Every open prompt round of a Bond's log, newest activity first. */
export async function loadBondLog(bondId: string): Promise<BondLogRound[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("bond_log", { p_bond_id: bondId });
  if (error) console.error("[bonds] bond_log failed", error);
  const rows = data ?? [];
  const photos = await signPaths(
    "media",
    rows.flatMap((row) => [row.my_photo_path, row.their_photo_path]),
    { width: 900 },
  );

  return rows.map((row) => ({
    activityId: row.activity_id,
    kind: row.kind,
    activityStartedAt: row.activity_started_at,
    activityEnded: row.activity_ended,
    round: row.round,
    opensOn: row.opens_on,
    title: row.title ?? "",
    subtitle: row.subtitle,
    mine: row.my_saved
      ? {
          body: row.my_body,
          photoUrl: row.my_photo_path ? (photos.get(row.my_photo_path) ?? null) : null,
          photoPath: row.my_photo_path,
          shared: row.my_shared,
        }
      : null,
    theirs: row.their_shared
      ? { body: row.their_body, photoUrl: row.their_photo_path ? (photos.get(row.their_photo_path) ?? null) : null }
      : null,
    theirShared: row.their_shared,
  }));
}

/** Grouv Log → Bond Log: every Bond keeping a log with the viewer. */
export async function loadMyBondLogs(): Promise<BondLogSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_bond_logs");
  if (error) console.error("[bonds] my_bond_logs failed", error);

  return (data ?? []).flatMap((row) =>
    row.status === "active" || row.status === "released"
      ? [
          {
            bondId: row.bond_id,
            userId: row.user_id,
            name: row.first_name,
            avatarUrl: row.avatar_url,
            chapterSlug: row.chapter_slug,
            phase: row.phase,
            status: row.status,
            sharedCount: row.shared_count,
            waitingOnMe: row.waiting_on_me,
          },
        ]
      : [],
  );
}
