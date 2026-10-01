import type { NextRequest } from "next/server";
import { getChapter } from "@/lib/chapters";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { wrapRangeLabel } from "@/lib/wrapped";

/**
 * Archive → ⋯ → Download (Figma 1466:25032, toast 1449:22800).
 *
 * One closed chapter as a single self-contained HTML keepsake: the closing
 * reflection, every Log moment and every post from while it was open, with
 * photos embedded so it opens offline and prints cleanly to PDF. Built under
 * the member's own session, so it only ever holds what's theirs. (The whole
 * account as JSON lives at /api/export.)
 */
const PHOTO_BUDGET_BYTES = 20 * 1024 * 1024;

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return new Response("Sign in to download this chapter.", { status: 401 });

  const { data: chapter } = await supabase
    .from("user_chapters")
    .select("id, chapter_slug, phase, opened_at, closed_at, chapter_closures(taught, advice, carrying_forward, reflections)")
    .eq("id", id)
    .eq("user_id", userId)
    .eq("status", "closed")
    .maybeSingle();
  if (!chapter?.closed_at) return new Response("That chapter isn't in your archive.", { status: 404 });

  const [{ data: logs }, posts] = await Promise.all([
    supabase
      .from("log_entries")
      .select("id, body, photo_path, entry_date, scope, created_at")
      .eq("user_id", userId)
      .eq("user_chapter_id", chapter.id)
      .order("entry_date")
      .order("created_at"),
    loadAllPosts(supabase, chapter.chapter_slug, chapter.opened_at, chapter.closed_at),
  ]);

  // Photos inline, oldest first, until the budget runs out.
  let budget = PHOTO_BUDGET_BYTES;
  const embed = async (path: string | null) => {
    if (!path || budget <= 0) return null;
    const { data } = await supabase.storage.from("media").download(path);
    if (!data || data.size > budget) return null;
    budget -= data.size;
    const base64 = Buffer.from(await data.arrayBuffer()).toString("base64");
    return `data:${data.type || "image/jpeg"};base64,${base64}`;
  };

  const logHtml: string[] = [];
  for (const entry of logs ?? []) {
    const photo = await embed(entry.photo_path);
    logHtml.push(`<article class="item">
  <p class="meta">${esc(longDate(entry.entry_date))}${entry.scope === "bond" ? " · Bond Log" : ""}</p>
  ${photo ? `<img src="${photo}" alt="">` : entry.photo_path ? `<p class="note">(Photo kept in Grouv)</p>` : ""}
  ${entry.body ? `<p>${esc(entry.body)}</p>` : ""}
</article>`);
  }

  const postHtml: string[] = [];
  for (const post of posts) {
    const photos: string[] = [];
    let kept = 0;
    for (const media of post.media) {
      const src = media.kind === "photo" ? await embed(media.path) : null;
      if (src) photos.push(`<img src="${src}" alt="">`);
      else kept++;
    }
    postHtml.push(`<article class="item">
  <p class="meta">${esc(longDate(post.created_at))}${post.is_anonymous ? " · Posted anonymously" : ""}</p>
  ${post.title ? `<h3>${esc(post.title)}</h3>` : ""}
  ${post.body ? `<p>${esc(post.body)}</p>` : ""}
  ${photos.join("\n")}
  ${kept ? `<p class="note">(${kept} ${kept === 1 ? "video or photo" : "videos or photos"} kept in Grouv)</p>` : ""}
</article>`);
  }

  const name = getChapter(chapter.chapter_slug)?.name ?? "Chapter";
  const closure = chapter.chapter_closures;
  const answers: [string, string][] = (
    [
      ["What this chapter taught me", closure?.taught],
      ["What I’d tell someone starting", closure?.advice],
      ["Who I’m carrying forward", closure?.carrying_forward],
      ...(closure?.reflections ?? []).map((r) => ["Reflection", r] as const),
    ] as [string, string | null | undefined][]
  ).flatMap(([prompt, value]) => (value ? [[prompt, value] as [string, string]] : []));

  const span = wrapRangeLabel("chapter", chapter.opened_at, chapter.closed_at);
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(name)} — Grouv Life Archive</title>
<style>
  body { font: 16px/1.55 system-ui, -apple-system, "Segoe UI", sans-serif; color: #1c1b1a; background: #faf9f7; margin: 0; }
  main { max-width: 720px; margin: 0 auto; padding: 48px 20px 80px; }
  h1 { font-size: 32px; margin: 0 0 4px; }
  h2 { font-size: 20px; margin: 40px 0 12px; color: #863e11; }
  h3 { font-size: 17px; margin: 0 0 6px; }
  .eyebrow { color: #dd661b; font-size: 12px; letter-spacing: .06em; text-transform: uppercase; margin: 0 0 8px; }
  .sub, .meta, .note { color: #676666; font-size: 13px; margin: 0 0 8px; }
  .item { background: #fff; border-radius: 12px; padding: 16px; margin: 0 0 12px; break-inside: avoid; }
  .item p { white-space: pre-wrap; margin: 0 0 8px; }
  img { display: block; max-width: 100%; border-radius: 10px; margin: 8px 0; }
  .answer { background: #fff; border-radius: 12px; padding: 16px; margin: 0 0 12px; }
  .answer h3 { font-size: 13px; color: #676666; font-weight: 500; }
  .answer p { white-space: pre-wrap; margin: 0; }
  @media print { body { background: #fff; } .item, .answer { border: 1px solid #e8e8e8; } }
</style>
</head>
<body>
<main>
  <p class="eyebrow">Grouv Life Archive</p>
  <h1>${esc(name)}</h1>
  <p class="sub">${esc(chapter.phase)} · ${esc(span)}</p>

  <h2>Reflection</h2>
  ${
    answers.length
      ? answers.map(([prompt, value]) => `<div class="answer"><h3>${esc(prompt)}</h3><p>${esc(value)}</p></div>`).join("\n")
      : `<p class="note">No reflection was written when this chapter closed.</p>`
  }

  <h2>Grouv Log · ${logHtml.length} ${logHtml.length === 1 ? "moment" : "moments"}</h2>
  ${logHtml.join("\n") || `<p class="note">No moments were logged in this chapter.</p>`}

  <h2>Posts · ${postHtml.length}</h2>
  ${postHtml.join("\n") || `<p class="note">You didn’t post in this chapter.</p>`}

  <p class="note">Downloaded ${esc(longDate(new Date().toISOString()))}. Only you can see what&rsquo;s in this file until you share it.</p>
</main>
</body>
</html>`;

  const file = `grouv-${chapter.chapter_slug}-${chapter.closed_at.slice(0, 10)}.html`;
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="${file}"`,
      "Cache-Control": "no-store",
    },
  });
}

type Supabase = Awaited<ReturnType<typeof createClient>>;
type PostRow = Database["public"]["Functions"]["feed_posts"]["Returns"][number];

/** Every post of the member's from the chapter's window, newest first. */
async function loadAllPosts(supabase: Supabase, slug: string, from: string, to: string) {
  const all: PostRow[] = [];
  let cursor: { before: string; beforeId: string } | null = null;
  for (let page = 0; page < 25; page++) {
    const { data, error }: { data: PostRow[] | null; error: unknown } = await supabase.rpc("feed_posts", {
      p_scope: "mine",
      p_chapter_slug: slug,
      p_from: from,
      p_to: to,
      p_before: cursor?.before ?? null,
      p_before_id: cursor?.beforeId ?? null,
      p_limit: 50,
    });
    if (error) {
      console.error("[archive] feed_posts for download failed", error);
      break;
    }
    const rows: PostRow[] = data ?? [];
    all.push(...rows);
    const last: PostRow | undefined = rows.at(-1);
    if (rows.length < 50 || !last) break;
    cursor = { before: last.created_at, beforeId: last.id };
  }
  return all;
}

const long = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

function longDate(value: string) {
  return long.format(new Date(value.length === 10 ? `${value}T12:00:00Z` : value));
}

function esc(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
