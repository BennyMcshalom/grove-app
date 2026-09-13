"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireOnboardedViewer } from "@/lib/auth/viewer";
import { getChapter } from "@/lib/chapters";
import { signPaths } from "@/lib/storage-server";
import { sendNotificationEmailsSoon } from "@/lib/email/notifications";
import { createClient } from "@/lib/supabase/server";

export type SpaceActionResult = { error?: string };

/** Directory card → "Join" → "That's where i am". */
export async function joinSpace(slug: string, phase: string): Promise<SpaceActionResult> {
  const viewer = await requireOnboardedViewer();
  const chapter = getChapter(slug);
  if (!chapter || !chapter.options.includes(phase)) {
    return { error: "Pick where you are in this chapter first." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("user_chapters")
    .insert({ user_id: viewer.userId, chapter_slug: slug, phase });

  if (error) {
    if (error.hint === "chapter_limit") {
      return { error: "You can only hold 4 chapters at once. Close one to make room." };
    }
    if (error.code === "23505") return { error: `You already hold ${chapter.name}.` };
    console.error("[spaces] joinSpace failed", error);
    if (error?.hint === "rate_limited") return { error: error.message };
    return { error: "We couldn't add that space. Try again." };
  }

  refresh();
  return {};
}

/** Open tab → "Connect". Accepts their request instead if they asked first. */
export async function connectWithMember(
  userId: string,
  chapterSlug: string,
): Promise<SpaceActionResult & { status?: "pending" | "accepted" | "declined" }> {
  await requireOnboardedViewer();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("request_connection", {
    p_other: userId,
    p_chapter_slug: chapterSlug,
  });

  if (error || !data) {
    console.error("[spaces] connectWithMember failed", error);
    if (error?.hint === "rate_limited") return { error: error.message };
    return { error: "We couldn't send that request. Try again." };
  }
  if (data.status === "pending") await sendNotificationEmailsSoon();
  return { status: data.status };
}

/** Ask Members → "Enter Grouv": invite someone in this space to bond. */
export async function inviteMemberToBond(
  userId: string,
  chapterSlug: string,
): Promise<SpaceActionResult & { status?: "pending" | "active" | "declined" | "released" }> {
  await requireOnboardedViewer();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("invite_bond", {
    p_other: userId,
    p_chapter_slug: chapterSlug,
  });

  if (error || !data) {
    console.error("[spaces] inviteMemberToBond failed", error);
    if (error?.hint === "rate_limited") return { error: error.message };
    return { error: "We couldn't send that invite. Try again." };
  }
  if (data.status === "pending") await sendNotificationEmailsSoon();
  return { status: data.status };
}

/** Anonymous tab → "Ask". Lives for 7 days; replies come back without names. */
export async function askSpace(
  chapterSlug: string,
  body: string,
): Promise<SpaceActionResult & { question?: { id: string; body: string } }> {
  await requireOnboardedViewer();
  const text = body.trim();
  if (!text) return { error: "Write your question first." };
  if (text.length > 1000) return { error: "Keep your question under 1,000 characters." };
  if (!getChapter(chapterSlug)) return { error: "That space doesn't exist." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("space_questions")
    .insert({ chapter_slug: chapterSlug, body: text })
    .select("id, body")
    .single();

  if (error || !data) {
    if (error?.code === "42501") return { error: "You can only ask spaces you hold." };
    console.error("[spaces] askSpace failed", error);
    if (error?.hint === "rate_limited") return { error: error.message };
    return { error: "We couldn't send your question. Try again." };
  }
  return { question: data };
}

const CloseSchema = z.object({
  userChapterId: z.uuid(),
  taught: z.string().max(4000),
  advice: z.string().max(4000),
  carryingForward: z.string().max(4000),
  reflections: z.array(z.string().max(4000)).max(20),
});

export type CloseChapterInput = z.input<typeof CloseSchema>;

/** Close Chapter wizard → "Close this Chapter". */
export async function closeChapter(input: CloseChapterInput): Promise<SpaceActionResult> {
  await requireOnboardedViewer();
  const parsed = CloseSchema.safeParse(input);
  if (!parsed.success) return { error: "Some of your answers are too long to save." };

  const { userChapterId, taught, advice, carryingForward, reflections } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("close_chapter", {
    p_user_chapter_id: userChapterId,
    p_taught: taught,
    p_advice: advice,
    p_carrying_forward: carryingForward,
    p_reflections: reflections,
  });

  if (error) {
    console.error("[spaces] closeChapter failed", error);
    if (error?.hint === "rate_limited") return { error: error.message };
    return { error: "We couldn't close this chapter. Try again." };
  }

  refresh();
  return {};
}

export interface QuestionReply {
  id: string;
  body: string | null;
  audioUrl: string | null;
  durationSeconds: number | null;
  mine: boolean;
}

/** Replies the viewer may see: all of them for the asker, their own otherwise. */
export async function loadQuestionReplies(questionId: string): Promise<QuestionReply[]> {
  await requireOnboardedViewer();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("question_replies", { p_question_id: questionId });
  if (error) console.error("[spaces] question_replies failed", error);

  const rows = data ?? [];
  const signed = await signPaths("media", rows.map((r) => r.audio_path));
  return rows.map((r) => ({
    id: r.id,
    body: r.body,
    audioUrl: r.audio_path ? (signed.get(r.audio_path) ?? null) : null,
    durationSeconds: r.duration_seconds,
    mine: r.is_mine,
  }));
}

/** "Record a reply" (or a written one). Replies go back to the asker without a name. */
export async function replyToQuestion(
  questionId: string,
  reply: { body?: string; audioPath?: string; durationSeconds?: number | null },
): Promise<SpaceActionResult> {
  const viewer = await requireOnboardedViewer();
  const body = reply.body?.trim() || null;
  const audioPath = reply.audioPath ?? null;
  if (!body && !audioPath) return { error: "Record or write a reply first." };
  if (body && body.length > 2000) return { error: "Keep replies under 2,000 characters." };
  if (audioPath && !audioPath.startsWith(`${viewer.userId}/`)) {
    return { error: "Your recording didn't finish uploading." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("space_question_replies").insert({
    question_id: questionId,
    body,
    audio_path: audioPath,
    duration_seconds: reply.durationSeconds ?? null,
  });

  if (error) {
    if (audioPath) await supabase.storage.from("media").remove([audioPath]);
    if (error.code === "42501") return { error: "This question is no longer taking replies." };
    console.error("[spaces] replyToQuestion failed", error);
    if (error?.hint === "rate_limited") return { error: error.message };
    return { error: "We couldn't send your reply. Try again." };
  }
  return {};
}
