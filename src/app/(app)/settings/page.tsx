import { SettingsView } from "@/components/app/settings/SettingsView";
import { getShellViewer } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

/** Settings — Figma frame 390:13507. Data here; layout in SettingsView. */
export default async function SettingsPage() {
  const viewer = await getShellViewer();
  const supabase = await createClient();

  const [{ data: prompts }, { data: preferences }, { data: profile }] = await Promise.all([
    supabase
      .from("profile_prompts")
      .select("honest_tension, sitting_with, open_to")
      .eq("user_id", viewer.id)
      .maybeSingle(),
    supabase
      .from("notification_preferences")
      .select("chapter_prompt, wave_received")
      .eq("user_id", viewer.id)
      .single(),
    supabase.from("profiles").select("theme, log_visibility").eq("id", viewer.id).single(),
  ]);

  return (
    <SettingsView
      prompts={{
        honestTension: prompts?.honest_tension ?? null,
        sittingWith: prompts?.sitting_with ?? null,
        openTo: prompts?.open_to ?? null,
      }}
      preferences={{
        theme: profile?.theme ?? "light",
        logVisibility: profile?.log_visibility ?? "circle",
        chapterPrompt: preferences?.chapter_prompt ?? true,
        waveReceived: preferences?.wave_received ?? true,
      }}
    />
  );
}
