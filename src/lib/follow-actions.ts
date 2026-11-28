"use server";

import { requireOnboardedViewer } from "@/lib/auth/viewer";
import { isUuid } from "@/lib/mentions";
import { createClient } from "@/lib/supabase/server";

/**
 * Follow / Unfollow someone (user_follows, 20261128100000): one-way and
 * instant. RLS refuses yourself, people you've blocked and people who
 * blocked you.
 */
export async function setFollowing(userId: string, following: boolean): Promise<{ error?: string }> {
  const viewer = await requireOnboardedViewer();
  if (!isUuid(userId) || userId === viewer.userId) return { error: "You can't follow this person." };
  const supabase = await createClient();
  const { error } = following
    ? await supabase.from("user_follows").insert({ followee_id: userId })
    : await supabase.from("user_follows").delete().eq("follower_id", viewer.userId).eq("followee_id", userId);
  if (error && error.code !== "23505") {
    if (error.code === "42501") return { error: "You can't follow this person." };
    console.error("[follows] setFollowing failed", error);
    return { error: "That didn't go through. Try again." };
  }
  return {};
}
