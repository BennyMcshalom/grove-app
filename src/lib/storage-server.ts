import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Private-bucket links last two hours, and each one is reused for up to 75
 * minutes. A fresh signature on every render would give the same picture a
 * new URL on every page view, so the browser and CDN could never cache it —
 * every visit downloaded every photo again.
 */
const SIGNED_URL_SECONDS = 2 * 60 * 60;
const REUSE_FOR_MS = 75 * 60 * 1000;
const MAX_CACHED = 5000;

/** Only pictures can be resized; video, audio and documents are signed as-is. */
const RESIZABLE = /\.(jpe?g|png|webp|avif)$/i;

const signedCache = new Map<string, { url: string; until: number }>();

/**
 * Who's asking, so a cached link is only ever handed back to the person whose
 * own signature request (and its Storage RLS check) produced it.
 */
const viewerKey = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims?.sub ?? "anon";
});

/**
 * Signed URLs for objects in a private bucket, keyed by path. Paths the
 * viewer can't read (or that no longer exist) are simply missing.
 *
 * `width` asks Supabase's image transformer for a resized copy of pictures
 * (served as WebP to browsers that take it) — a phone photo shown in a
 * 400px card no longer downloads at 4000px.
 */
export async function signPaths(
  bucket: "media" | "chat",
  paths: (string | null | undefined)[],
  options: { width?: number } = {},
): Promise<Map<string, string>> {
  const unique = [...new Set(paths.filter((p): p is string => Boolean(p)))];
  const signed = new Map<string, string>();
  if (unique.length === 0) return signed;

  const viewer = await viewerKey();
  const now = Date.now();
  const keyOf = (path: string) => `${viewer}|${bucket}|${path}|${resizedWidth(path, options.width) ?? 0}`;

  const missing: string[] = [];
  for (const path of unique) {
    const hit = signedCache.get(keyOf(path));
    if (hit && hit.until > now) signed.set(path, hit.url);
    else missing.push(path);
  }
  if (missing.length === 0) return signed;

  const supabase = await createClient();
  const storage = supabase.storage.from(bucket);
  const plain = missing.filter((p) => !resizedWidth(p, options.width));
  const resized = missing.filter((p) => resizedWidth(p, options.width));

  const remember = (path: string, url: string) => {
    signed.set(path, url);
    if (signedCache.size >= MAX_CACHED) {
      // Oldest first: Map keeps insertion order.
      for (const key of signedCache.keys()) {
        signedCache.delete(key);
        if (signedCache.size < MAX_CACHED * 0.9) break;
      }
    }
    signedCache.set(keyOf(path), { url, until: now + REUSE_FOR_MS });
  };

  await Promise.all([
    plain.length > 0 &&
      storage.createSignedUrls(plain, SIGNED_URL_SECONDS).then(({ data, error }) => {
        if (error) console.error(`[storage] signing ${bucket} failed`, error);
        data?.forEach((item) => {
          if (item.path && item.signedUrl) remember(item.path, item.signedUrl);
        });
      }),
    // Transforms are signed one by one (the batch call takes no transform).
    ...resized.map((path) =>
      storage
        .createSignedUrl(path, SIGNED_URL_SECONDS, { transform: { width: options.width!, resize: "contain" } })
        .then(({ data, error }) => {
          if (error) console.error(`[storage] signing a resized ${bucket} image failed`, error);
          if (data?.signedUrl) remember(path, data.signedUrl);
        }),
    ),
  ]);

  return signed;
}

function resizedWidth(path: string, width: number | undefined) {
  return width && RESIZABLE.test(path) ? width : undefined;
}
