"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireOnboardedViewer } from "@/lib/auth/viewer";
import { getChapter } from "@/lib/chapters";
import { ART_ICON, GROUP_ARTS, type GroupArtKey } from "@/lib/group-look";
import type { Group } from "@/lib/groups";
import { loadGroups } from "@/lib/groups-server";
import { sendNotificationEmailsSoon } from "@/lib/email/notifications";
import { sendEmail } from "@/lib/email/send";
import { siteUrl } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";

type Result = { error?: string };

const CreateGroupSchema = z.object({
  title: z.string().trim().min(1, "Give the group a name").max(80, "Keep the name under 80 characters"),
  label: z.string().trim().max(60, "Keep the label under 60 characters"),
  description: z.string().trim().max(1000, "Keep it under 1,000 characters"),
  art: z.enum(GROUP_ARTS.map((a) => a.key) as [GroupArtKey, ...GroupArtKey[]]),
  color: z.string().regex(/^#[0-9a-f]{6}$/i, "Pick a colour"),
  chapterSlug: z.string().nullable(),
});

const LookSchema = CreateGroupSchema.pick({ art: true, color: true });

export type CreateGroupInput = z.input<typeof CreateGroupSchema>;

/** Start a group → "Create group". The creator becomes its admin. */
export async function createGroup(
  input: CreateGroupInput,
): Promise<Result & { slug?: string; passRequired?: boolean }> {
  await requireOnboardedViewer();
  const parsed = CreateGroupSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the group's details." };

  const { title, label, description, art, color, chapterSlug } = parsed.data;
  if (chapterSlug && !getChapter(chapterSlug)) return { error: "That space doesn't exist." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("groups")
    .insert({
      title,
      label: label || null,
      description: description || null,
      icon: ART_ICON[art],
      art,
      color: color.toUpperCase(),
      chapter_slug: chapterSlug,
    })
    .select("slug")
    .single();

  if (error || !data) {
    if (error?.hint === "pass_required") return { error: "Starting a group comes with the Season Pass.", passRequired: true };
    console.error("[groups] createGroup failed", error);
    if (error?.hint === "rate_limited") return { error: error.message };
    return { error: "We couldn't start that group. Try again." };
  }

  refresh();
  return { slug: data.slug };
}

/**
 * Colours other groups already wear, anywhere in the app, so a new one can
 * take a different one ("no two colours the same"). Groups sit side by side
 * across Spaces in the rail and on Browse, so the whole app counts. Once all
 * sixteen are taken, the picker falls back to any palette colour.
 */
export async function loadTakenGroupColors(): Promise<string[]> {
  await requireOnboardedViewer();
  const supabase = await createClient();
  const { data, error } = await supabase.from("groups").select("color");
  if (error) console.error("[groups] taken colours failed", error);
  return (data ?? []).map((g) => g.color);
}

/** Admins change a group's art and colour. RLS lets only admins update. */
export async function updateGroupLook(groupId: string, input: { art: string; color: string }): Promise<Result> {
  await requireOnboardedViewer();
  const parsed = LookSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Pick art and a colour." };
  const { art, color } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("groups")
    .update({ art, color: color.toUpperCase(), icon: ART_ICON[art] })
    .eq("id", groupId)
    .select("id");
  if (error) console.error("[groups] updateGroupLook failed", error);
  if (error || !data?.length) return { error: "Only the group's admins can change its look." };

  refresh();
  return {};
}

/** "Join" on an open group; "Send join request" on one an admin reviews. */
export async function joinGroup(groupId: string): Promise<Result & { status?: "joined" | "requested" }> {
  const viewer = await requireOnboardedViewer();
  const supabase = await createClient();

  const { data: group } = await supabase.from("groups").select("join_policy").eq("id", groupId).maybeSingle();
  if (!group) return { error: "That group no longer exists." };

  if (group.join_policy === "open") {
    const { error } = await supabase.from("group_members").insert({ group_id: groupId, user_id: viewer.userId });
    if (error && error.code !== "23505") {
      console.error("[groups] joinGroup failed", error);
      if (error?.hint === "rate_limited") return { error: error.message };
      return { error: "We couldn't add you to that group. Try again." };
    }
    refresh();
    return { status: "joined" };
  }

  const { error } = await supabase.from("group_join_requests").insert({ group_id: groupId });
  if (error && error.code !== "23505") {
    console.error("[groups] join request failed", error);
    if (error?.hint === "rate_limited") return { error: error.message };
    return { error: "We couldn't send your request. Try again." };
  }
  if (!error) await sendNotificationEmailsSoon();
  refresh();
  return { status: "requested" };
}

export async function withdrawJoinRequest(groupId: string): Promise<Result> {
  const viewer = await requireOnboardedViewer();
  const supabase = await createClient();
  await supabase
    .from("group_join_requests")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", viewer.userId)
    .eq("status", "pending");
  refresh();
  return {};
}

export async function leaveGroup(groupId: string): Promise<Result> {
  const viewer = await requireOnboardedViewer();
  const supabase = await createClient();
  const { error } = await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", viewer.userId);
  if (error) {
    console.error("[groups] leaveGroup failed", error);
    if (error?.hint === "rate_limited") return { error: error.message };
    return { error: "We couldn't take you out of that group. Try again." };
  }
  refresh();
  return {};
}

export async function reviewJoinRequest(requestId: string, approve: boolean): Promise<Result> {
  await requireOnboardedViewer();
  const supabase = await createClient();
  const { error } = await supabase.rpc("review_join_request", { p_request_id: requestId, p_approve: approve });
  if (error) {
    return { error: error.code === "42501" ? "Only group admins can review requests." : "That request is no longer pending." };
  }
  await sendNotificationEmailsSoon();
  refresh();
  return {};
}

/** Truth Board → "Post anonymously". */
export async function postTruth(groupId: string, body: string): Promise<Result> {
  await requireOnboardedViewer();
  const text = body.trim();
  if (!text) return { error: "Finish the sentence first." };
  if (text.length > 1000) return { error: "Keep it under 1,000 characters." };

  const supabase = await createClient();
  const { error } = await supabase.from("truths").insert({ group_id: groupId, body: text });
  if (error) {
    if (error.code === "42501") return { error: "Only members can post to the Truth Board." };
    console.error("[groups] postTruth failed", error);
    if (error?.hint === "rate_limited") return { error: error.message };
    return { error: "We couldn't post that. Try again." };
  }
  refresh();
  return {};
}

/** "22 people felt this" — mark or unmark. */
export async function setFelt(truthId: string, felt: boolean): Promise<Result> {
  const viewer = await requireOnboardedViewer();
  const supabase = await createClient();
  const { error } = felt
    ? await supabase.from("truth_felt").insert({ truth_id: truthId, user_id: viewer.userId })
    : await supabase.from("truth_felt").delete().eq("truth_id", truthId).eq("user_id", viewer.userId);
  if (error && error.code !== "23505") return { error: "That didn't go through. Try again." };
  return {};
}

export async function deleteTruth(truthId: string): Promise<Result> {
  await requireOnboardedViewer();
  const supabase = await createClient();
  const { data, error } = await supabase.from("truths").delete().eq("id", truthId).select("id");
  if (error || !data?.length) return { error: "You can only remove your own truths." };
  refresh();
  return {};
}

/** Video Truths → "Record a video truth". The file is already in Storage. */
export async function addVideoTruth(
  groupId: string,
  storagePath: string,
  durationSeconds: number | null,
): Promise<Result> {
  const viewer = await requireOnboardedViewer();
  if (!storagePath.startsWith(`${viewer.userId}/`)) return { error: "Your video didn't finish uploading." };

  const supabase = await createClient();
  const { error } = await supabase.from("video_truths").insert({
    group_id: groupId,
    storage_path: storagePath,
    duration_seconds: durationSeconds,
  });
  if (error) {
    await supabase.storage.from("media").remove([storagePath]);
    if (error.code === "42501") return { error: "Only members can add video truths." };
    console.error("[groups] addVideoTruth failed", error);
    if (error?.hint === "rate_limited") return { error: error.message };
    return { error: "We couldn't add your video. Try again." };
  }
  refresh();
  return {};
}

export async function deleteVideoTruth(videoId: string): Promise<Result> {
  await requireOnboardedViewer();
  const supabase = await createClient();
  const { data, error } = await supabase.from("video_truths").delete().eq("id", videoId).select("storage_path");
  if (error || !data?.length) return { error: "You can only remove your own videos." };
  await supabase.storage.from("media").remove([data[0].storage_path]);
  refresh();
  return {};
}

/** Groups in the viewer's chapters they could join, for the rails. */
export async function loadSuggestedGroups(limit = 6): Promise<Group[]> {
  await requireOnboardedViewer();
  return loadGroups({ suggested: true, limit });
}

/** The request-outcome modal was seen; don't show it again. */
export async function acknowledgeGroupRequest(groupId: string): Promise<Result> {
  await requireOnboardedViewer();
  const supabase = await createClient();
  const { error } = await supabase.rpc("acknowledge_group_request", { p_group_id: groupId });
  if (error) console.error("[groups] acknowledge_group_request failed", error);
  return {};
}

// ---------------------------------------------------------------------------
// Manage group (admins). The database checks every one of these.
// ---------------------------------------------------------------------------

const DetailsSchema = CreateGroupSchema.pick({ title: true, label: true, description: true }).extend({
  joinPolicy: z.enum(["open", "approval"]),
});

/** Name, label, description and who can join. */
export async function updateGroupDetails(groupId: string, input: z.input<typeof DetailsSchema>): Promise<Result> {
  await requireOnboardedViewer();
  const parsed = DetailsSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the group's details." };
  const { title, label, description, joinPolicy } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("groups")
    .update({ title, label: label || null, description: description || null, join_policy: joinPolicy })
    .eq("id", groupId)
    .select("id");
  if (error || !data?.length) {
    if (error) console.error("[groups] updateGroupDetails failed", error);
    return { error: "Only the group's admins can change that." };
  }
  refresh();
  return {};
}

/** Make a member a co-admin, or back to member. */
export async function setGroupMemberRole(groupId: string, userId: string, role: "admin" | "member"): Promise<Result> {
  await requireOnboardedViewer();
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_group_member_role", { p_group: groupId, p_user: userId, p_role: role });
  if (error) {
    if (error.hint && ["not_admin", "not_member", "creator", "last_admin"].includes(error.hint)) return { error: error.message };
    console.error("[groups] set_group_member_role failed", error);
    return { error: "That didn't save. Try again." };
  }
  refresh();
  return {};
}

/** Take someone out of the group (never its creator). */
export async function removeGroupMember(groupId: string, userId: string): Promise<Result> {
  await requireOnboardedViewer();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .select("user_id");
  if (error || !data?.length) {
    if (error) console.error("[groups] removeGroupMember failed", error);
    return { error: "They couldn't be removed. The group's creator always stays." };
  }
  refresh();
  return {};
}

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "info@grouv.app";

/**
 * Delete group → "Ask support". Admins can't delete a group themselves (a
 * whole group's conversation would go with it); support gets an email and the
 * request waits on /moderation.
 */
export async function requestGroupDeletion(groupId: string, reason: string): Promise<Result> {
  const viewer = await requireOnboardedViewer();
  const text = reason.trim().slice(0, 1000);
  const supabase = await createClient();
  const { error } = await supabase.rpc("request_group_deletion", { p_group: groupId, p_reason: text || null });
  if (error) {
    if (error.hint === "not_admin") return { error: error.message };
    console.error("[groups] request_group_deletion failed", error);
    return { error: "We couldn't send that. Try again." };
  }

  const { data: group } = await supabase.from("groups").select("title, slug, member_count").eq("id", groupId).maybeSingle();
  if (group) {
    const site = await siteUrl();
    const lines = [
      `${viewer.profile.first_name} asked to delete the group "${group.title}" (${group.member_count} members).`,
      text ? `Reason: ${text}` : "No reason given.",
      `Group: ${site}/groups/${group.slug}`,
      `Review it in the moderation queue: ${site}/moderation`,
    ];
    void sendEmail({
      to: SUPPORT_EMAIL,
      subject: `Group deletion request: ${group.title}`,
      text: lines.join("\n\n"),
      html: lines.map((l) => `<p>${l.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</p>`).join(""),
    });
  }
  refresh();
  return {};
}
