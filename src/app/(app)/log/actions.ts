"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireOnboardedViewer } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

const EntrySchema = z.object({
  userChapterId: z.uuid(),
  promptId: z.uuid().nullable(),
  body: z.string().trim().max(2000),
  photoPath: z.string().nullable(),
  scope: z.enum(["solo", "bond"]),
  bondId: z.uuid().nullable(),
  /** The viewer's local calendar day. */
  entryDate: z.iso.date(),
});

export type LogEntryInput = z.input<typeof EntrySchema>;

/** "Write today's moment" → Save. */
export async function saveLogEntry(input: LogEntryInput): Promise<{ error?: string }> {
  const viewer = await requireOnboardedViewer();
  const parsed = EntrySchema.safeParse(input);
  if (!parsed.success) return { error: "Something in that moment didn't look right." };

  const { userChapterId, promptId, body, photoPath, scope, bondId, entryDate } = parsed.data;
  if (!body && !photoPath) return { error: "Write something or add a photo first." };
  if (scope === "bond" && !bondId) return { error: "Choose which bond to share this with." };
  if (photoPath && !photoPath.startsWith(`${viewer.userId}/`)) {
    return { error: "Your photo didn't finish uploading. Try adding it again." };
  }

  // Local "today" can be a day either side of the server's.
  const drift = Math.abs(Date.parse(`${entryDate}T12:00:00Z`) - Date.now());
  if (drift > 36 * 60 * 60 * 1000) return { error: "Moments are logged for today." };

  const supabase = await createClient();
  const { error } = await supabase.from("log_entries").insert({
    user_chapter_id: userChapterId,
    prompt_id: promptId,
    body: body || null,
    photo_path: photoPath,
    scope,
    bond_id: scope === "bond" ? bondId : null,
    entry_date: entryDate,
  });

  if (error) {
    if (error.code === "42501") return { error: "You can only log into chapters you hold." };
    console.error("[log] saveLogEntry failed", error);
    if (error?.hint === "rate_limited") return { error: error.message };
    return { error: "We couldn't save that moment. Try again." };
  }

  refresh();
  return {};
}

export async function deleteLogEntry(entryId: string): Promise<{ error?: string }> {
  await requireOnboardedViewer();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("log_entries")
    .delete()
    .eq("id", entryId)
    .select("photo_path");

  if (error || !data?.length) {
    if (error) console.error("[log] deleteLogEntry failed", error);
    if (error?.hint === "rate_limited") return { error: error.message };
    return { error: "You can only remove your own moments." };
  }

  const photo = data[0].photo_path;
  if (photo) await supabase.storage.from("media").remove([photo]);
  refresh();
  return {};
}
