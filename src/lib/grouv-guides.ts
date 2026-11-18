import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Which of these people are Grouv guides — the labelled house accounts that
 * keep the feed alive while Grouv is young (migration 20261118100000). Cards
 * and comments show a "Guide" tag next to their names. (Not the feature
 * guides in src/lib/guides.ts.)
 */
export async function guideIds(ids: (string | null | undefined)[]): Promise<Set<string>> {
  const unique = [...new Set(ids.filter((id): id is string => !!id))];
  if (unique.length === 0) return new Set();
  const supabase = await createClient();
  const { data, error } = await supabase.from("guides").select("user_id").in("user_id", unique);
  if (error) console.error("[guides] lookup failed", error);
  return new Set((data ?? []).map((g) => g.user_id));
}
