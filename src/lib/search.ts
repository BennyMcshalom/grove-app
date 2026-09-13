"use server";

import { requireOnboardedViewer } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

export interface SearchResult {
  kind: "person" | "post" | "group" | "space";
  id: string;
  title: string;
  subtitle: string | null;
  image: string | null;
  chapterSlug: string | null;
}

/** People, posts, groups and spaces matching a phrase (two characters or more). */
export async function searchEverything(query: string): Promise<SearchResult[]> {
  await requireOnboardedViewer();
  const term = query.trim().slice(0, 80);
  if (term.length < 2) return [];

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_everything", { p_query: term, p_limit: 8 });
  if (error) console.error("[search] search_everything failed", error);

  return (data ?? []).map((row) => ({
    kind: row.kind,
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    image: row.image,
    chapterSlug: row.chapter_slug,
  }));
}
