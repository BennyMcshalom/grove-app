"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireOnboardedViewer } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

const ModerateSchema = z.object({
  targetType: z.enum(["post", "comment", "message", "group", "event", "profile", "truth", "space_question"]),
  targetId: z.uuid(),
  action: z.enum(["dismiss", "remove"]),
  note: z.string().max(1000).optional(),
});

/** Moderation → "Keep it" / "Remove it". Resolves every open report on the target. */
export async function moderate(input: z.input<typeof ModerateSchema>): Promise<{ error?: string }> {
  await requireOnboardedViewer();
  const parsed = ModerateSchema.safeParse(input);
  if (!parsed.success) return { error: "That report doesn't look right." };

  const { targetType, targetId, action, note } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("moderate_target", {
    p_target_type: targetType,
    p_target_id: targetId,
    p_action: action,
    p_note: note ?? null,
  });

  if (error) {
    console.error("[moderation] moderate failed", error);
    if (error.code === "42501") return { error: "Only staff can review reports." };
    if (error.code === "23514") return { error: error.message };
    return { error: "We couldn't save that decision. Try again." };
  }

  refresh();
  return {};
}

/** A group admin asked support to delete their group → Delete it / Keep it. */
export async function resolveGroupDeletion(requestId: string, remove: boolean): Promise<{ error?: string }> {
  await requireOnboardedViewer();
  if (!z.uuid().safeParse(requestId).success) return { error: "That request doesn't look right." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("resolve_group_deletion", { p_request: requestId, p_delete: remove });
  if (error) {
    if (error.hint === "gone" || error.hint === "not_staff") return { error: error.message };
    console.error("[moderation] resolve_group_deletion failed", error);
    return { error: "That didn't go through. Try again." };
  }
  refresh();
  return {};
}
