import "server-only";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Anonymous posts and question replies must not carry the author's id, but
 * every upload lands in `<user id>/…` (the upload policy insists). Before an
 * anonymous row is saved, its files are moved to `anon/<random>.<ext>` with
 * the service role, so the stored path says nothing about who wrote it.
 * Readers still reach them through the media read policy, which follows the
 * row that references the path (migration 20261018100100).
 */

const ANON_PREFIX = "anon/";

export const isAnonPath = (path: string) => path.startsWith(ANON_PREFIX);

/** Moves each path (already checked with isOwnMediaPath) and returns the new ones in order, or null on failure. */
export async function relocateForAnonymity(paths: string[]): Promise<string[] | null> {
  const storage = createAdminClient().storage.from("media");
  const moved: string[] = [];
  for (const path of paths) {
    const extension = path.split(".").pop()?.toLowerCase() ?? "bin";
    const target = `${ANON_PREFIX}${randomUUID()}.${extension}`;
    const { error } = await storage.move(path, target);
    if (error) {
      console.error("[anon-media] move failed", error.message);
      // Put back what already moved so the author can try again.
      for (let i = 0; i < moved.length; i++) await storage.move(moved[i], paths[i]);
      return null;
    }
    moved.push(target);
  }
  return moved;
}

/**
 * Removes anonymous files after their row is gone. Only call this once the
 * caller has deleted the row through their own (RLS-checked) client, which
 * proves they owned it.
 */
export async function removeAnonFiles(paths: string[]) {
  const anon = paths.filter(isAnonPath);
  if (!anon.length) return;
  const { error } = await createAdminClient().storage.from("media").remove(anon);
  if (error) console.warn("[anon-media] couldn't remove files", error.message);
}
