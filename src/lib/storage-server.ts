import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Private-bucket links last an hour; pages re-sign on every render. */
const SIGNED_URL_SECONDS = 60 * 60;

/**
 * Signed URLs for objects in a private bucket, keyed by path. Paths the
 * viewer can't read (or that no longer exist) are simply missing.
 */
export async function signPaths(
  bucket: "media" | "chat",
  paths: (string | null | undefined)[],
): Promise<Map<string, string>> {
  const unique = [...new Set(paths.filter((p): p is string => Boolean(p)))];
  const signed = new Map<string, string>();
  if (unique.length === 0) return signed;

  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrls(unique, SIGNED_URL_SECONDS);
  if (error) console.error(`[storage] signing ${bucket} failed`, error);
  data?.forEach((item) => {
    if (item.path && item.signedUrl) signed.set(item.path, item.signedUrl);
  });
  return signed;
}
