"use server";

import { requireOnboardedViewer } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";
import type { MentionContext, MentionPerson } from "@/lib/mentions";

/**
 * The @ autocomplete: people whose first name starts with `query` that the
 * viewer may mention here (mention_candidates decides; the same rules the
 * database applies when the words are saved).
 */
export async function findMentionable(context: MentionContext, query: string): Promise<MentionPerson[]> {
  await requireOnboardedViewer();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("mention_candidates", {
    p_query: query.slice(0, 40),
    p_post_id: context.kind === "post" ? context.postId : null,
    p_chapter_slug: context.kind === "space" ? context.chapterSlug : null,
    p_conversation_id: context.kind === "conversation" ? context.conversationId : null,
  });
  if (error) {
    console.error("[mentions] mention_candidates failed", error);
    return [];
  }
  return (data ?? []).map((row) => ({
    id: row.user_id,
    name: row.first_name,
    avatarUrl: row.avatar_url,
    aura: row.aura,
  }));
}
