import { ProfilePreviewView } from "@/components/app/settings/ProfilePreviewView";
import { getShellViewer } from "@/lib/auth/viewer";
import { loadFeed } from "@/lib/feed";
import { loadMyLogEntries } from "@/lib/log-server";
import { DEFAULT_AUDIENCES, type PreviewAs } from "@/lib/profile-audience";
import { createClient } from "@/lib/supabase/server";

/**
 * "See your profile the way others do" — Figma 1680:42043 (Profile Preview),
 * from Settings → Privacy & AI controls. Your own Grouv page with your data,
 * cut down to what a stranger, a connection or a Bond would see.
 */
export default async function ProfilePreviewPage({ searchParams }: PageProps<"/settings/preview">) {
  const { as } = await searchParams;
  const viewAs: PreviewAs = as === "circle" || as === "bond" ? as : "stranger";

  const viewer = await getShellViewer();
  const supabase = await createClient();

  const [posts, logs, { data: details }, { data: prompts }, { data: profile }] = await Promise.all([
    loadFeed({ scope: "mine" }, viewer.firstName),
    // Solo moments only, as on anyone's Grouv: Bond Logs belong inside the Bond.
    loadMyLogEntries(viewer.id, { limit: 60 }).then((entries) => entries.filter((e) => e.scope === "solo")),
    supabase
      .from("profile_details")
      .select("bio, birthday, bio_audience, location_audience, chapter_audience, birthday_audience")
      .eq("user_id", viewer.id)
      .maybeSingle(),
    supabase.from("profile_prompts").select("honest_tension, sitting_with, open_to").eq("user_id", viewer.id).maybeSingle(),
    supabase.from("profiles").select("log_visibility").eq("id", viewer.id).single(),
  ]);

  return (
    <ProfilePreviewView
      as={viewAs}
      bio={details?.bio ?? null}
      birthday={details?.birthday ?? null}
      audiences={{
        bio: details?.bio_audience ?? DEFAULT_AUDIENCES.bio,
        location: details?.location_audience ?? DEFAULT_AUDIENCES.location,
        chapter: details?.chapter_audience ?? DEFAULT_AUDIENCES.chapter,
        birthday: details?.birthday_audience ?? DEFAULT_AUDIENCES.birthday,
      }}
      prompts={{
        struggling: prompts?.honest_tension ?? null,
        building: prompts?.sitting_with ?? null,
        open: prompts?.open_to ?? null,
      }}
      logVisibility={profile?.log_visibility ?? "circle"}
      posts={posts}
      logs={logs}
    />
  );
}
