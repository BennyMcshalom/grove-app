import { createClient } from "@/lib/supabase/server";

/**
 * Settings → Privacy & AI → "Download my data" (PRD §12 "Export requested",
 * §13: data export is never paywalled). The signed-in member's own data as one
 * JSON file, built by export_my_data() under their own session — so it can
 * only ever contain what's theirs.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return new Response("Sign in to download your data.", { status: 401 });

  const { data, error } = await supabase.rpc("export_my_data");
  if (error || !data) {
    console.error("[export] export_my_data failed", error);
    return new Response("We couldn't put your data together. Try again.", { status: 500 });
  }

  // Bio, birthday and who sees each profile field (owner-only table).
  const { data: details } = await supabase
    .from("profile_details")
    .select("bio, birthday, bio_audience, location_audience, chapter_audience, birthday_audience, updated_at")
    .eq("user_id", claims.claims.sub)
    .maybeSingle();
  const file = typeof data === "object" && !Array.isArray(data) ? { ...data, profile_details: details ?? null } : data;

  const day = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(file, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="grouv-data-${day}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
