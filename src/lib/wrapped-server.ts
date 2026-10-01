import "server-only";
import { signPaths } from "@/lib/storage-server";
import { createClient } from "@/lib/supabase/server";
import type { Wrap, WrapChoices, WrapSummary } from "@/lib/wrapped";

type WrapRow = {
  id: string;
  title: string;
  range: WrapSummary["range"];
  starts_on: string;
  ends_on: string;
  created_at: string;
  user_chapter_id: string | null;
};

const WRAP_COLUMNS = "id, title, range, starts_on, ends_on, created_at, user_chapter_id";

function toSummary(row: WrapRow): WrapSummary {
  return {
    id: row.id,
    title: row.title,
    range: row.range,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    createdAt: row.created_at,
    userChapterId: row.user_chapter_id,
  };
}

/** One of the viewer's wraps with its moments; RLS keeps it to their own. */
export async function loadWrap(wrapId: string): Promise<Wrap | null> {
  const supabase = await createClient();
  const [{ data: wrap, error }, { data: moments }] = await Promise.all([
    supabase.from("wraps").select(WRAP_COLUMNS).eq("id", wrapId).maybeSingle(),
    supabase
      .from("wrap_moments")
      .select("id, position, body, photo_path, moment_date, entry:log_entries(chapter:user_chapters(status))")
      .eq("wrap_id", wrapId)
      .order("position"),
  ]);
  if (error) console.error("[wrapped] loading a wrap failed", error);
  if (!wrap) return null;

  const rows = moments ?? [];
  const signed = await signPaths("media", rows.map((m) => m.photo_path), { width: 1080 });
  return {
    ...toSummary(wrap),
    moments: rows.map((m) => ({
      id: m.id,
      body: m.body,
      photoUrl: m.photo_path ? (signed.get(m.photo_path) ?? null) : null,
      date: m.moment_date,
      sourceEditable: m.entry?.chapter?.status === "open",
    })),
  };
}

/** The viewer's newest wrap if it was made in the last week — for the Home card. */
export async function loadFreshWrap(userId: string): Promise<WrapSummary | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("wraps")
    .select(WRAP_COLUMNS)
    .eq("user_id", userId)
    .gt("created_at", new Date(Date.now() - 7 * 86_400_000).toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) console.error("[wrapped] loading the newest wrap failed", error);
  return data ? toSummary(data) : null;
}

/** The viewer's wraps for closed chapters, keyed by chapter. */
export async function loadChapterWrapIds(userChapterIds: string[]): Promise<Map<string, string>> {
  const found = new Map<string, string>();
  if (userChapterIds.length === 0) return found;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("wraps")
    .select("id, user_chapter_id")
    .in("user_chapter_id", userChapterIds);
  if (error) console.error("[wrapped] loading chapter wraps failed", error);
  data?.forEach((row) => row.user_chapter_id && found.set(row.user_chapter_id, row.id));
  return found;
}

/** Everything the "Create a Life Wrapped" steps offer, plus the newest wrap. */
export async function loadWrapChoices(userId: string): Promise<WrapChoices> {
  const supabase = await createClient();
  const [{ data: chapters, error }, { data: latest }] = await Promise.all([
    supabase
      .from("user_chapters")
      .select("id, chapter_slug, phase, status, opened_at, closed_at")
      .eq("user_id", userId)
      .order("opened_at"),
    supabase
      .from("wraps")
      .select(WRAP_COLUMNS)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (error) console.error("[wrapped] loading chapters failed", error);

  const rows = chapters ?? [];
  return {
    sources: rows
      .filter((c) => c.status === "open")
      .map((c) => ({ id: c.id, slug: c.chapter_slug, phase: c.phase })),
    closed: rows
      .filter((c) => c.status === "closed" && c.closed_at)
      .sort((a, b) => (b.closed_at ?? "").localeCompare(a.closed_at ?? ""))
      .map((c) => ({
        id: c.id,
        slug: c.chapter_slug,
        phase: c.phase,
        openedAt: c.opened_at,
        closedAt: c.closed_at ?? c.opened_at,
      })),
    latest: latest ? toSummary(latest) : null,
  };
}
