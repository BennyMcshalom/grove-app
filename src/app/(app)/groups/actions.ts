"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireOnboardedViewer } from "@/lib/auth/viewer";
import { getChapter } from "@/lib/chapters";
import { GROUP_COLORS, type Group } from "@/lib/groups";
import { PICKER_ICONS } from "@/lib/icons";
import { loadGroups } from "@/lib/groups-server";
import { createClient } from "@/lib/supabase/server";

type Result = { error?: string };

const CreateGroupSchema = z.object({
  title: z.string().trim().min(1, "Give the group a name").max(80, "Keep the name under 80 characters"),
  label: z.string().trim().max(60, "Keep the label under 60 characters"),
  description: z.string().trim().max(1000, "Keep it under 1,000 characters"),
  icon: z.enum(PICKER_ICONS),
  color: z.enum(GROUP_COLORS),
  chapterSlug: z.string().nullable(),
});

export type CreateGroupInput = z.input<typeof CreateGroupSchema>;

/** Start a group → "Create group". The creator becomes its admin. */
export async function createGroup(input: CreateGroupInput): Promise<Result & { slug?: string }> {
  await requireOnboardedViewer();
  const parsed = CreateGroupSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the group's details." };

  const { title, label, description, icon, color, chapterSlug } = parsed.data;
  if (chapterSlug && !getChapter(chapterSlug)) return { error: "That space doesn't exist." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("groups")
    .insert({ title, label: label || null, description: description || null, icon, color, chapter_slug: chapterSlug })
    .select("slug")
    .single();

  if (error || !data) {
    console.error("[groups] createGroup failed", error);
    return { error: "We couldn't start that group. Try again." };
  }

  refresh();
  return { slug: data.slug };
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
      return { error: "We couldn't add you to that group. Try again." };
    }
    refresh();
    return { status: "joined" };
  }

  const { error } = await supabase.from("group_join_requests").insert({ group_id: groupId });
  if (error && error.code !== "23505") {
    console.error("[groups] join request failed", error);
    return { error: "We couldn't send your request. Try again." };
  }
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
