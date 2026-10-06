"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireOnboardedViewer } from "@/lib/auth/viewer";
import type { CompanionMessage } from "@/lib/invites";
import { createClient } from "@/lib/supabase/server";

/**
 * Chapter Companions, after the invitation: check-ins and replies, mute,
 * leave or remove, the owner's updates, note and chosen moments. Every one
 * of these is checked again in the database.
 */

type Result = { error?: string };

const KNOWN = ["not_companion", "body", "rate_limited", "gone", "not_yours", "photos", "no_audience", "note", "too_many_moments", "not_your_moment"];

function fail(scope: string, error: { message: string; hint?: string } | null, fallback: string): Result {
  if (error?.hint && KNOWN.includes(error.hint)) return { error: error.message };
  console.error(`[companions] ${scope} failed`, error);
  return { error: fallback };
}

/** "Check in with John", or the owner's reply. */
export async function sendCompanionMessage(
  companionId: string,
  body: string,
): Promise<Result & { message?: CompanionMessage }> {
  const viewer = await requireOnboardedViewer();
  const text = body.trim();
  if (!text) return { error: "Write something first." };
  if (text.length > 2000) return { error: "Keep it under 2,000 characters." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("send_companion_message", { p_companion_id: companionId, p_body: text });
  if (error || !data) return fail("send_companion_message", error, "We couldn't send that. Try again.");
  return {
    message: {
      id: data,
      authorId: viewer.userId,
      authorName: viewer.profile.first_name,
      authorAvatar: viewer.profile.avatar_url,
      body: text,
      createdAt: new Date().toISOString(),
    },
  };
}

/** The companion mutes (or unmutes) a chapter's notifications. */
export async function setCompanionMuted(companionId: string, muted: boolean): Promise<Result> {
  await requireOnboardedViewer();
  const supabase = await createClient();
  const { error } = await supabase.rpc("mute_companion", { p_companion_id: companionId, p_muted: muted });
  if (error) return fail("mute_companion", error, "We couldn't change that. Try again.");
  return {};
}

/** The owner removes a companion, or the companion leaves. Access ends at once. */
export async function endCompanionship(companionId: string): Promise<Result> {
  await requireOnboardedViewer();
  const supabase = await createClient();
  const { error } = await supabase.rpc("end_companion", { p_companion_id: companionId });
  if (error) return fail("end_companion", error, "We couldn't do that. Try again.");
  refresh();
  return {};
}

const UpdateSchema = z.object({
  userChapterId: z.uuid(),
  body: z.string().trim().max(2000, "Keep it under 2,000 characters"),
  photoPath: z.string().nullable(),
  /** null: everyone walking with this chapter who gets updates. */
  companionIds: z.array(z.uuid()).nullable(),
});

/** "Share an update" — only to the companions picked. */
export async function shareCompanionUpdate(input: z.input<typeof UpdateSchema>): Promise<Result> {
  await requireOnboardedViewer();
  const parsed = UpdateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check your update." };
  const { userChapterId, body, photoPath, companionIds } = parsed.data;
  if (!body && !photoPath) return { error: "Write something or add a photo." };
  if (companionIds && companionIds.length === 0) return { error: "Pick at least one person." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("share_companion_update", {
    p_user_chapter_id: userChapterId,
    p_body: body || null,
    p_photo_path: photoPath,
    p_companion_ids: companionIds,
  });
  if (error) return fail("share_companion_update", error, "We couldn't share your update. Try again.");
  refresh();
  return {};
}

const NoteSchema = z.object({
  userChapterId: z.uuid(),
  whereNow: z.string().trim().max(1000, "Keep it under 1,000 characters"),
  milestone: z.string().trim().max(200, "Keep the milestone under 200 characters"),
  milestoneDate: z.union([z.iso.date(), z.literal("")]),
});

/** Edit "Where are you now?" and the next milestone. */
export async function saveCompanionNote(input: z.input<typeof NoteSchema>): Promise<Result> {
  await requireOnboardedViewer();
  const parsed = NoteSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check your note." };
  const { userChapterId, whereNow, milestone, milestoneDate } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_companion_note", {
    p_user_chapter_id: userChapterId,
    p_where_now: whereNow || null,
    p_milestone: milestone || null,
    p_milestone_date: milestoneDate || null,
  });
  if (error) return fail("set_companion_note", error, "We couldn't save that. Try again.");
  refresh();
  return {};
}

/** The moments one companion currently sees (the owner's own selection). */
export async function loadCompanionSelection(companionId: string): Promise<{ logEntryIds: string[]; postIds: string[] }> {
  await requireOnboardedViewer();
  const supabase = await createClient();
  const { data: companion } = await supabase
    .from("chapter_companions")
    .select("invite_id")
    .eq("id", companionId)
    .maybeSingle();
  if (!companion) return { logEntryIds: [], postIds: [] };
  // RLS: only the owner reads the selection.
  const { data } = await supabase
    .from("chapter_invite_moments")
    .select("log_entry_id, post_id")
    .eq("invite_id", companion.invite_id);
  return {
    logEntryIds: (data ?? []).flatMap((m) => (m.log_entry_id ? [m.log_entry_id] : [])),
    postIds: (data ?? []).flatMap((m) => (m.post_id ? [m.post_id] : [])),
  };
}

/** "Add more moments": what one companion can see from the story so far. */
export async function saveCompanionMoments(companionId: string, logEntryIds: string[], postIds: string[]): Promise<Result> {
  await requireOnboardedViewer();
  const ids = z.array(z.uuid()).max(30, "Pick up to 30 moments");
  const parsed = ids.safeParse([...logEntryIds, ...postIds]);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check your moments." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_companion_moments", {
    p_companion_id: companionId,
    p_log_entry_ids: logEntryIds,
    p_post_ids: postIds,
  });
  if (error) return fail("set_companion_moments", error, "We couldn't save those moments. Try again.");
  refresh();
  return {};
}

/** Take back an invitation nobody has answered. */
export async function revokeCompanionInvite(inviteId: string): Promise<Result> {
  await requireOnboardedViewer();
  const supabase = await createClient();
  const { error } = await supabase.rpc("revoke_companion_invite", { p_invite_id: inviteId });
  if (error) return fail("revoke_companion_invite", error, "We couldn't cancel that invitation. Try again.");
  refresh();
  return {};
}

/** The Space page's Companions line: how many walk with you, and invitations out. */
export async function loadCompanionCounts(userChapterId: string): Promise<{ companions: number; pending: number; faces: { userId: string; name: string; avatarUrl: string | null }[] }> {
  await requireOnboardedViewer();
  const supabase = await createClient();
  const [list, pending] = await Promise.all([
    supabase.rpc("chapter_companion_list", { p_user_chapter_id: userChapterId }),
    supabase.rpc("chapter_pending_invites", { p_user_chapter_id: userChapterId }),
  ]);
  const rows = list.data ?? [];
  return {
    companions: rows.length,
    pending: pending.data?.length ?? 0,
    faces: rows.slice(0, 3).map((r) => ({ userId: r.user_id, name: r.name, avatarUrl: r.avatar_url })),
  };
}

/** How many chapters the viewer walks with (the Bonds link). */
export async function loadWalkingWithCount(): Promise<number> {
  await requireOnboardedViewer();
  const supabase = await createClient();
  const { data } = await supabase.rpc("walking_with");
  return data?.length ?? 0;
}
