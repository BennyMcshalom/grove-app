"use server";

import { z } from "zod";
import { requireOnboardedViewer } from "@/lib/auth/viewer";
import { siteUrl } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";
import { loadWrap, loadWrapChoices } from "@/lib/wrapped-server";
import type { Wrap, WrapChoices } from "@/lib/wrapped";

/**
 * Life Wrapped server actions (PRD §9): generate, edit and share a wrap, plus
 * the closing ritual's close / undo. The Season Pass gate lives in SQL; these
 * turn its hints into something the flow can show.
 */

type Failure = { error: string; reason?: "pass" | "not_enough" | "failed" };

function failure(error: { hint?: string; message?: string } | null, fallback: string): Failure {
  if (error?.hint === "pass_required") return { error: "Life Wrapped comes with the Season Pass.", reason: "pass" };
  if (error?.hint === "not_enough") return { error: "Not enough moments yet.", reason: "not_enough" };
  if (error?.hint === "rate_limited" || error?.hint === "empty" || error?.hint === "no_sources") {
    return { error: error.message ?? fallback, reason: "failed" };
  }
  return { error: fallback, reason: "failed" };
}

/** The steps' choices and the newest wrap, for the Grouv Log card. */
export async function getWrapChoices(): Promise<WrapChoices> {
  const viewer = await requireOnboardedViewer();
  return loadWrapChoices(viewer.userId);
}

/** A wrap to view. Readable on Free: only making and changing one is gated. */
export async function getWrap(wrapId: string): Promise<Wrap | null> {
  await requireOnboardedViewer();
  if (!z.uuid().safeParse(wrapId).success) return null;
  return loadWrap(wrapId);
}

const GenerateSchema = z.discriminatedUnion("range", [
  z.object({
    range: z.enum(["week", "month"]),
    sourceIds: z.array(z.uuid()).min(1).max(8),
    /** The viewer's local calendar day. */
    today: z.iso.date(),
  }),
  z.object({ range: z.literal("chapter"), userChapterId: z.uuid() }),
]);

export type GenerateWrapInput = z.input<typeof GenerateSchema>;

/** "Continue" → Preparing → the wrap, or why there isn't one. */
export async function generateWrap(input: GenerateWrapInput): Promise<{ wrap: Wrap } | Failure> {
  await requireOnboardedViewer();
  const parsed = GenerateSchema.safeParse(input);
  if (!parsed.success) return { error: "Pick what your wrap should cover.", reason: "failed" };

  const supabase = await createClient();
  const args = parsed.data;
  const { data: wrapId, error } = await supabase.rpc(
    "generate_wrap",
    args.range === "chapter"
      ? { p_range: "chapter", p_user_chapter_id: args.userChapterId }
      : { p_range: args.range, p_source_chapter_ids: args.sourceIds, p_today: args.today },
  );
  if (error || !wrapId) {
    if (error?.hint !== "not_enough" && error?.hint !== "pass_required") {
      console.error("[wrapped] generate_wrap failed", error);
    }
    return failure(error, "We couldn’t put this together.");
  }

  const wrap = await loadWrap(wrapId);
  return wrap ? { wrap } : { error: "We couldn’t put this together.", reason: "failed" };
}

const MomentSchema = z.object({
  momentId: z.uuid(),
  body: z.string().max(2000),
  updateSource: z.boolean(),
});

/** Editing → Save. Returns whether the original Log memory changed too. */
export async function saveWrapMoment(
  input: z.input<typeof MomentSchema>,
): Promise<{ sourceUpdated: boolean } | Failure> {
  await requireOnboardedViewer();
  const parsed = MomentSchema.safeParse(input);
  if (!parsed.success) return { error: "That’s a little long for one moment." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("update_wrap_moment", {
    p_moment_id: parsed.data.momentId,
    p_body: parsed.data.body,
    p_update_source: parsed.data.updateSource,
  });
  if (error) {
    console.error("[wrapped] update_wrap_moment failed", error);
    return failure(error, "We couldn’t save that. Try again.");
  }
  return { sourceUpdated: Boolean(data) };
}

/** Preview: the moment's text exactly as the card will carry it. */
export async function previewShareText(momentId: string, hideNames: boolean): Promise<string | null> {
  await requireOnboardedViewer();
  if (!z.uuid().safeParse(momentId).success) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("wrap_share_preview", {
    p_moment_id: momentId,
    p_hide_names: hideNames,
  });
  if (error) console.error("[wrapped] wrap_share_preview failed", error);
  return data ?? null;
}

const ShareSchema = z.object({
  momentId: z.uuid(),
  hideNames: z.boolean(),
  hidePhotos: z.boolean(),
});

/** Preview → "Create link". */
export async function createShareLink(
  input: z.input<typeof ShareSchema>,
): Promise<{ id: string; url: string } | Failure> {
  await requireOnboardedViewer();
  const parsed = ShareSchema.safeParse(input);
  if (!parsed.success) return { error: "Pick a moment to share.", reason: "failed" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_wrap_share", {
    p_moment_id: parsed.data.momentId,
    p_hide_names: parsed.data.hideNames,
    p_hide_photos: parsed.data.hidePhotos,
  });
  const link = data?.[0];
  if (error || !link) {
    console.error("[wrapped] create_wrap_share failed", error);
    return failure(error, "We couldn’t send this out.");
  }
  return { id: link.id, url: `${await siteUrl()}/w/${link.token}` };
}

/** "Revoke link" → confirm. Never gated. */
export async function revokeShareLink(shareId: string): Promise<{ error?: string }> {
  await requireOnboardedViewer();
  if (!z.uuid().safeParse(shareId).success) return { error: "That link is already off." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("revoke_wrap_share", { p_share_id: shareId });
  if (error) {
    console.error("[wrapped] revoke_wrap_share failed", error);
    return { error: "We couldn’t revoke that link. Try again." };
  }
  return {};
}

const CloseSchema = z.object({
  userChapterId: z.uuid(),
  taught: z.string().max(4000),
  advice: z.string().max(4000),
  carryingForward: z.string().max(4000),
  reflections: z.array(z.string().max(4000)).max(20),
});

/**
 * Close chapter → "Close this Chapter". Same RPC as the Spaces action, but it
 * doesn't refresh the page: the wizard still has its closing screens to show
 * and refreshes when the member leaves them.
 */
export async function finishChapter(input: z.input<typeof CloseSchema>): Promise<{ error?: string }> {
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
    console.error("[wrapped] close_chapter failed", error);
    if (error.hint === "rate_limited") return { error: error.message };
    return { error: "We couldn't close this chapter. Try again." };
  }
  return {};
}

/** "Chapter closed" → Undo, for the first few minutes. */
export async function undoCloseChapter(userChapterId: string): Promise<{ error?: string }> {
  await requireOnboardedViewer();
  if (!z.uuid().safeParse(userChapterId).success) return { error: "We couldn't reopen this chapter." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("reopen_chapter", { p_user_chapter_id: userChapterId });
  if (error) {
    if (error.hint === "too_late" || error.hint === "reopened" || error.hint === "chapter_limit") {
      return { error: error.message };
    }
    console.error("[wrapped] reopen_chapter failed", error);
    return { error: "We couldn't reopen this chapter. Try again." };
  }
  return {};
}
