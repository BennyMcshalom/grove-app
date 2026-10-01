"use server";

import { cookies } from "next/headers";
import { refresh } from "next/cache";
import { z } from "zod";
import { requireOnboardedViewer } from "@/lib/auth/viewer";
import { loadBondPeople } from "@/lib/bonds-server";
import { getChapter } from "@/lib/chapters";
import { INVITE_COOKIE, type InvitePerson, type PendingInvitation } from "@/lib/invites";
import { signPaths } from "@/lib/storage-server";
import { createClient } from "@/lib/supabase/server";

type Result = { error?: string };

const SINCE = new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric" });

/** "Invite someone to this chapter" — your Bonds first, then your circle and the Space. */
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

const InviteSchema = z.object({
  userChapterId: z.uuid(),
  title: z.string().trim().min(1, "Give your invitation a title").max(120, "Keep the title under 120 characters"),
  note: z.string().trim().max(1000, "Keep the note under 1,000 characters"),
  photoPaths: z.array(z.string()).max(4),
  recipients: z.array(z.uuid()).max(30, "Invite up to 30 people at a time"),
});

export type ChapterInviteInput = z.input<typeof InviteSchema>;

/** Preview → "Send Invite". Returns the /i/<token> link for sharing. */
export async function sendChapterInvite(input: ChapterInviteInput): Promise<Result & { token?: string }> {
  await requireOnboardedViewer();
  const parsed = InviteSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check your invitation." };

  const { userChapterId, title, note, photoPaths, recipients } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_chapter_invite", {
    p_user_chapter_id: userChapterId,
    p_title: title,
    p_note: note || null,
    p_photo_paths: photoPaths,
    p_recipients: recipients,
  });

  if (error || !data?.[0]) {
    console.error("[invites] sendChapterInvite failed", error);
    if (error?.hint && ["rate_limited", "space_paused", "not_reachable", "title", "note", "photos", "too_many"].includes(error.hint)) {
      return { error: error.message };
    }
    return { error: "We couldn't send your invitation. Try again." };
  }
  return { token: data[0].token };
}

export type RespondResult = Result & {
  status?: "joined" | "declined";
  /** Opening the Space needs a stage first (the "where are you?" sheet). */
  needsPhase?: boolean;
  /** Full on Free: the Season Pass paywall, reason "space_limit". */
  spaceLimit?: boolean;
};

/** "Join chapter" / "Decline invitation" — in the app and on /i/<token>. */
export async function respondChapterInvite(token: string, accept: boolean, phase?: string): Promise<RespondResult> {
  await requireOnboardedViewer();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("respond_chapter_invite", {
    p_token: token,
    p_accept: accept,
    p_phase: phase ?? null,
  });

  if (error || !data) {
    if (error?.hint === "phase_required") return { needsPhase: true };
    if (error?.hint === "chapter_limit") return { spaceLimit: true, error: error.message };
    if (error?.hint && ["gone", "own", "answered", "rate_limited"].includes(error.hint)) return { error: error.message };
    console.error("[invites] respondChapterInvite failed", error);
    return { error: "We couldn't answer that invitation. Try again." };
  }

  // Answered: the invitation no longer needs to follow them around.
  const jar = await cookies();
  if (jar.get(INVITE_COOKIE)?.value === token) jar.delete(INVITE_COOKIE);
  refresh();
  return { status: data };
}

/** INVITATIONS — the invitations waiting on the viewer. */
export async function loadMyInvitations(): Promise<PendingInvitation[]> {
  await requireOnboardedViewer();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_chapter_invitations");
  if (error) console.error("[invites] my_chapter_invitations failed", error);
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

/** Opening a row under INVITATIONS: the full card, photos signed. */
export async function loadInvitation(token: string) {
  await requireOnboardedViewer();
  const supabase = await createClient();
  const { data } = await supabase.rpc("chapter_invite_card", { p_token: token });
  const row = data?.[0];
  if (!row) return null;
  const signed = await signPaths("media", row.photo_paths);
  return {
    id: row.id,
    token,
    senderId: row.sender_id,
    senderName: row.sender_name,
    senderAvatar: row.sender_avatar,
    chapterSlug: row.chapter_slug,
    title: row.title,
    note: row.note,
    photoUrls: row.photo_paths.flatMap((p) => signed.get(p) ?? []),
    isSender: row.is_sender,
    myStatus: row.my_status,
    holdsChapter: row.holds_chapter,
  };
}
