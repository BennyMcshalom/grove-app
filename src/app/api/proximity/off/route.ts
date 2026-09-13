import { createClient } from "@/lib/supabase/server";

/**
 * "Turns off the moment you leave this page." Called with navigator.sendBeacon
 * when the Nearby tab is hidden or closed, where a Server Action can't run.
 */
export async function POST() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return new Response(null, { status: 401 });

  await supabase.from("proximity_sessions").delete().eq("user_id", userId);
  return new Response(null, { status: 204 });
}
