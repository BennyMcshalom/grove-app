import { EditProfileForm } from "@/components/app/settings/EditProfileForm";
import { getShellViewer } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

/** Edit Profile — Figma frame 404:15153. Data here; form in EditProfileForm. */
export default async function EditProfilePage() {
  const viewer = await getShellViewer();
  const supabase = await createClient();

  const { data: prompts } = await supabase
    .from("profile_prompts")
    .select("honest_tension, sitting_with, open_to")
    .eq("user_id", viewer.id)
    .maybeSingle();

  return (
    <EditProfileForm
      prompts={{
        honestTension: prompts?.honest_tension ?? "",
        sittingWith: prompts?.sitting_with ?? "",
        openTo: prompts?.open_to ?? "",
      }}
    />
  );
}
