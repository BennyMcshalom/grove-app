"use server";

import { cookies } from "next/headers";
import { refresh } from "next/cache";
import { z } from "zod";
import { requireOnboardedViewer } from "@/lib/auth/viewer";
import { loadBondPeople } from "@/lib/bonds-server";
import { getChapter } from "@/lib/chapters";
import { loadCompanionNote, loadInvitationCard, loadPickableMoments } from "@/lib/companions-server";
import { INVITE_COOKIE, type InvitePerson, type PendingInvitation, type PickableMoment } from "@/lib/invites";
import { siteUrl } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";

type Result = { error?: string };

const SINCE = new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric" });

/** Who you can invite: your Bonds first, then your circle and the Space. */
export async function loadInvitePeople(chapterSlug: string): Promise<InvitePerson[]> {
  await requireOnboardedViewer();
  if (!getChapter(chapterSlug)) return [];
  const supabase = await createClient();
  const [people, { data: members }] = await Promise.all([
    loadBondPeople(),
    supabase.rpc("space_members", { p_chapter_slug: chapterSlug }),
  ]);

  const seen = new Set<string>();
  const out: InvitePerson[] = [];
  for (const p of people.filter((p) => p.relationship === "bond")) {
    seen.add(p.userId);
    out.push({
      userId: p.userId,
      name: p.name,
      avatarUrl: p.avatarUrl,
      detail: `Bonded since ${SINCE.format(new Date(p.since))}`,
      group: "bond",
    });
  }
  for (const p of people.filter((p) => p.relationship === "circle")) {
    if (seen.has(p.userId)) continue;
    seen.add(p.userId);
    out.push({ userId: p.userId, name: p.name, avatarUrl: p.avatarUrl, detail: "In your circle", group: "suggested" });
  }
  for (const m of members ?? []) {
    if (seen.has(m.user_id)) continue;
    seen.add(m.user_id);
    out.push({ userId: m.user_id, name: m.first_name, avatarUrl: m.avatar_url, detail: m.phase, group: "suggested" });
  }
  return out;
}

/** Your own chapter, or null. */
async function ownChapter(userChapterId: string, userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_chapters")
    .select("id, chapter_slug, opened_at")
    .eq("id", userChapterId)
    .eq("user_id", userId)
    .maybeSingle();
  return data ? { id: data.id, chapterSlug: data.chapter_slug, openedAt: data.opened_at } : null;
}

/** What the invitation form starts from: your moments in this chapter and its current note. */
export async function loadInviteSetup(
  userChapterId: string,
): Promise<{ moments: PickableMoment[]; note: { whereNow: string; milestone: string; milestoneDate: string } }> {
  const viewer = await requireOnboardedViewer();
  const chapter = await ownChapter(userChapterId, viewer.userId);
  if (!chapter) return { moments: [], note: { whereNow: "", milestone: "", milestoneDate: "" } };
  const [moments, note] = await Promise.all([
    loadPickableMoments(viewer.userId, chapter),
    loadCompanionNote(chapter.id),
  ]);
  return { moments, note };
}

const InviteSchema = z.object({
  userChapterId: z.uuid(),
  title: z.string().trim().min(1, "Give your chapter a title").max(120, "Keep the title under 120 characters"),
  why: z.string().trim().max(1000, "Keep each answer under 1,000 characters"),
  ask: z.string().trim().max(1000, "Keep each answer under 1,000 characters"),
  whereNow: z.string().trim().max(1000, "Keep each answer under 1,000 characters"),
  milestone: z.string().trim().max(200, "Keep the milestone under 200 characters"),
  milestoneDate: z.union([z.iso.date(), z.literal("")]),
  share: z.object({ story: z.boolean(), current: z.boolean(), future: z.boolean() }),
  logEntryIds: z.array(z.uuid()).max(30, "Pick up to 30 moments"),
  postIds: z.array(z.uuid()).max(30, "Pick up to 30 moments"),
  recipient: z.uuid().nullable(),
});

export type CompanionInviteInput = z.input<typeof InviteSchema>;

/** Preview → "Send invitation". Returns the /i/<token> link on Grouv's one public origin. */
export async function sendCompanionInvite(input: CompanionInviteInput): Promise<Result & { link?: string }> {
  await requireOnboardedViewer();
  const parsed = InviteSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check your invitation." };

  const v = parsed.data;
  if (!v.share.story && !v.share.current && !v.share.future) return { error: "Choose at least one thing to share." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_companion_invite", {
    p_user_chapter_id: v.userChapterId,
    p_title: v.title,
    p_why: v.why || null,
    p_ask: v.ask || null,
    p_where_now: v.whereNow || null,
    p_milestone: v.milestone || null,
    p_milestone_date: v.milestoneDate || null,
    p_share_story: v.share.story,
    p_share_current: v.share.current,
    p_share_future: v.share.future,
    p_log_entry_ids: v.share.story ? v.logEntryIds : [],
    p_post_ids: v.share.story ? v.postIds : [],
    p_recipient: v.recipient,
  });

  if (error || !data?.[0]) {
    console.error("[invites] sendCompanionInvite failed", error);
    const known = [
      "rate_limited", "space_paused", "not_reachable", "already_companion", "title", "note",
      "nothing_shared", "too_many_moments", "not_your_moment",
    ];
    if (error?.hint && known.includes(error.hint)) return { error: error.message };
    return { error: "We couldn't send your invitation. Try again." };
  }
  return { link: `${await siteUrl()}/i/${data[0].token}` };
}

export type RespondResult = Result & { status?: "accepted" | "declined"; companionId?: string | null };

/** "Accept invitation" / "Not now" — in the app and on /i/<token>. */
export async function respondCompanionInvite(token: string, accept: boolean): Promise<RespondResult> {
  await requireOnboardedViewer();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("respond_companion_invite", { p_token: token, p_accept: accept });

  const row = data?.[0];
  if (error || !row) {
    if (error?.hint && ["gone", "own", "answered", "not_for_you"].includes(error.hint)) return { error: error.message };
    console.error("[invites] respondCompanionInvite failed", error);
    return { error: "We couldn't answer that invitation. Try again." };
  }

  // Answered: the invitation no longer needs to follow them around.
  const jar = await cookies();
  if (jar.get(INVITE_COOKIE)?.value === token) jar.delete(INVITE_COOKIE);
  refresh();
  return { status: row.status, companionId: row.companion_id };
}

/** INVITATIONS — the invitations waiting on the viewer. */
export async function loadMyInvitations(): Promise<PendingInvitation[]> {
  await requireOnboardedViewer();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_companion_invitations");
  if (error) console.error("[invites] my_companion_invitations failed", error);
  return (data ?? []).map((r) => ({
    id: r.id,
    token: r.token,
    title: r.title,
    chapterSlug: r.chapter_slug,
    senderName: r.sender_name,
    senderAvatar: r.sender_avatar,
    createdAt: r.created_at,
  }));
}

/** Opening a row under INVITATIONS: the full card. */
export async function loadInvitation(token: string) {
  await requireOnboardedViewer();
  return loadInvitationCard(token);
}
