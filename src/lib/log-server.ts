import "server-only";
import type { CircleLog, LogEntry } from "@/lib/log";
import { signPaths } from "@/lib/storage-server";
import { createClient } from "@/lib/supabase/server";

const DAY_MS = 86_400_000;

function dayNumber(entryDate: string, openedAt: string) {
  const opened = new Date(openedAt);
  const openedDay = Date.UTC(opened.getUTCFullYear(), opened.getUTCMonth(), opened.getUTCDate());
  return Math.max(1, Math.floor((Date.parse(`${entryDate}T00:00:00Z`) - openedDay) / DAY_MS) + 1);
}

/**
 * The viewer's own moments, newest first. Pass a user chapter to narrow to one
 * chapter (open or closed — the archive uses closed ones).
 */
export async function loadMyLogEntries(
  userId: string,
  { userChapterId, limit = 120 }: { userChapterId?: string; limit?: number } = {},
): Promise<LogEntry[]> {
  const supabase = await createClient();
  let query = supabase
    .from("log_entries")
    .select("id, body, photo_path, entry_date, scope, created_at, chapter:user_chapters(chapter_slug, opened_at)")
    .eq("user_id", userId)
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (userChapterId) query = query.eq("user_chapter_id", userChapterId);

  const { data, error } = await query;
  if (error) console.error("[log] loading my entries failed", error);

  const rows = data ?? [];
  const signed = await signPaths("media", rows.map((r) => r.photo_path));
  return rows.map((row) => ({
    id: row.id,
    body: row.body,
    photoUrl: row.photo_path ? (signed.get(row.photo_path) ?? null) : null,
    entryDate: row.entry_date,
    dayNumber: row.chapter ? dayNumber(row.entry_date, row.chapter.opened_at) : 1,
    chapterSlug: row.chapter?.chapter_slug ?? "",
    scope: row.scope,
  }));
}

/** Other people's logs the viewer may see: their circle ("solo") or bond logs. */
export async function loadCircleLogs(scope: "solo" | "bond"): Promise<CircleLog[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("circle_logs", { p_scope: scope, p_limit: 20 });
  if (error) console.error("[log] circle_logs failed", error);

  const rows = data ?? [];
  const signed = await signPaths("media", rows.flatMap((r) => r.entries.map((e) => e.photo_path)));
  return rows.map((row) => ({
    userId: row.user_id,
    name: row.first_name,
    avatarUrl: row.avatar_url,
    chapterSlug: row.chapter_slug,
    phase: row.phase,
    latestAt: row.latest_at,
    entries: row.entries.map((e) => ({
      id: e.id,
      body: e.body,
      photoUrl: e.photo_path ? (signed.get(e.photo_path) ?? null) : null,
      entryDate: e.entry_date,
      dayNumber: e.day_number,
      chapterSlug: e.chapter_slug,
      phase: e.phase,
      scope,
    })),
  }));
}

/** Today's prompt for each chapter, rotating daily through that chapter's set. */
export async function loadTodaysPrompts(
  chapterSlugs: string[],
): Promise<Record<string, { id: string; body: string }>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("log_prompts")
    .select("id, chapter_slug, body, sort_order")
    .order("sort_order");
  if (error) console.error("[log] log_prompts failed", error);

  const prompts = data ?? [];
  const dayIndex = Math.floor(Date.now() / DAY_MS);
  return Object.fromEntries(
    chapterSlugs.map((slug) => {
      const own = prompts.filter((p) => p.chapter_slug === slug);
      const pool = own.length > 0 ? own : prompts.filter((p) => p.chapter_slug === null);
      const pick = pool.length > 0 ? pool[dayIndex % pool.length] : null;
      return [slug, pick ? { id: pick.id, body: pick.body } : { id: "", body: "One honest moment from today" }];
    }),
  );
}

/** The first calendar day of the last seven, for "days logged this week". */
export function logWeekStart(now = Date.now()) {
  return new Date(now - 6 * DAY_MS).toISOString().slice(0, 10);
}
