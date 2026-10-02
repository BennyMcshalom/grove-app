import "server-only";
import type { Aura } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

/**
 * Each person's aura, for the status ring around their photo. For lists whose
 * RPC doesn't return it (circle logs, live rooms). Profiles are readable by
 * every signed-in member, so this is one small select; on error the photos
 * simply stay natural.
 */
export async function loadAuras(userIds: string[]): Promise<Map<string, Aura>> {
  const ids = [...new Set(userIds)];
  if (ids.length === 0) return new Map();
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("id, aura").in("id", ids);
  if (error) console.error("[profile] auras failed", error);
  return new Map((data ?? []).map((p) => [p.id, p.aura]));
}
