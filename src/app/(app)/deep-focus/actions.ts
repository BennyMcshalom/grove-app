"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requireOnboardedViewer } from "@/lib/auth/viewer";
import { FOCUS_DURATIONS, type FocusDuration } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

const HOUR = 60 * 60 * 1000;

/**
 * "Begin Deep Focus". The browser works out the end time so "this evening"
 * means the user's evening; the server only checks it's a sane window.
 */
export async function beginDeepFocus(
  duration: FocusDuration,
  endsAtIso: string,
): Promise<{ error?: string }> {
  const viewer = await requireOnboardedViewer();
  if (!FOCUS_DURATIONS.some((d) => d.value === duration)) {
    return { error: "Choose how long to focus for." };
  }

  const endsAt = new Date(endsAtIso);
  const now = Date.now();
  if (Number.isNaN(endsAt.getTime()) || endsAt.getTime() <= now || endsAt.getTime() > now + 7 * 24 * HOUR + HOUR) {
    return { error: "That end time doesn't look right. Choose a duration again." };
  }

  const supabase = await createClient();
  const nowIso = new Date(now).toISOString();

  // One session at a time: close any that's still running.
  await supabase
    .from("focus_sessions")
    .update({ ended_early_at: nowIso })
    .eq("user_id", viewer.userId)
    .is("ended_early_at", null)
    .gt("ends_at", nowIso);

  const { error } = await supabase
    .from("focus_sessions")
    .insert({ user_id: viewer.userId, duration, ends_at: endsAt.toISOString() });

  if (error) {
    console.error("[deep-focus] beginDeepFocus failed", error);
    return { error: "We couldn't start Deep Focus. Try again." };
  }

  refresh();
  return {};
}

/** "Return to Grouv" — ends the running session early. */
export async function endDeepFocus() {
  const viewer = await requireOnboardedViewer();
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  await supabase
    .from("focus_sessions")
    .update({ ended_early_at: nowIso })
    .eq("user_id", viewer.userId)
    .is("ended_early_at", null)
    .gt("ends_at", nowIso);

  redirect("/home");
}
