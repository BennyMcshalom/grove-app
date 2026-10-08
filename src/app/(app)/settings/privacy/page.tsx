import { PrivacyControlsView } from "@/components/app/settings/PrivacySections";
import { getShellViewer } from "@/lib/auth/viewer";
import { DEFAULT_AUDIENCES } from "@/lib/profile-audience";
import { createClient } from "@/lib/supabase/server";

/** Settings → Privacy & AI controls — Figma 1608:35963 (phone 1804:45264). */
export default async function PrivacyPage() {
  const viewer = await getShellViewer();
  const supabase = await createClient();

  const [{ data: privacy }, { data: details }, { count }] = await Promise.all([
    supabase.from("privacy_settings").select("discoverable, activity_matching").eq("user_id", viewer.id).maybeSingle(),
    supabase
      .from("profile_details")
      .select("bio_audience, location_audience, chapter_audience, birthday_audience")
      .eq("user_id", viewer.id)
      .maybeSingle(),
    supabase.from("blocks").select("blocked_id", { count: "exact", head: true }).eq("blocker_id", viewer.id),
  ]);

  return (
    <PrivacyControlsView
      privacy={{
        discoverable: privacy?.discoverable ?? true,
        activityMatching: privacy?.activity_matching ?? true,
      }}
      audiences={{
        bio: details?.bio_audience ?? DEFAULT_AUDIENCES.bio,
        location: details?.location_audience ?? DEFAULT_AUDIENCES.location,
        chapter: details?.chapter_audience ?? DEFAULT_AUDIENCES.chapter,
        birthday: details?.birthday_audience ?? DEFAULT_AUDIENCES.birthday,
      }}
      blockedCount={count ?? 0}
    />
  );
}
