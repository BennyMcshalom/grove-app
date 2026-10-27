"use server";

import { requireOnboardedViewer } from "@/lib/auth/viewer";
import { isGuideId } from "@/lib/guides";
import { createClient } from "@/lib/supabase/server";

/** A feature guide was closed: don't open it by itself again, on any device. */
export async function markGuideSeen(id: string): Promise<void> {
  const viewer = await requireOnboardedViewer();
  if (!isGuideId(id)) return;
  const supabase = await createClient();
  const { error } = await supabase
    .from("guide_views")
    .upsert({ user_id: viewer.userId, guide: id }, { onConflict: "user_id,guide", ignoreDuplicates: true });
  if (error) console.error("[guides] markGuideSeen failed", error);
}
