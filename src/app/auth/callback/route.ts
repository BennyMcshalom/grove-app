import { NextResponse, type NextRequest } from "next/server";
import { landingPath } from "@/lib/auth/viewer";
import { siteUrl } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";

/**
 * Google (and email link) sign-in lands here with a one-time code, which is
 * swapped for a session cookie before sending the user on.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const origin = await siteUrl();

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarded_at")
        .eq("id", data.user.id)
        .single();

      return NextResponse.redirect(`${origin}${landingPath(profile)}`);
    }
  }

  return NextResponse.redirect(`${origin}/sign-in?error=google`);
}
