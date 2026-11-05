import { NextResponse, type NextRequest } from "next/server";
import { POST_RETURN_COOKIE } from "@/lib/public-post-return";

/**
 * "Join Grouv" on a shared post: remember the post through sign-up and
 * onboarding, then go to sign-up. The app shell opens it once they're in
 * (PostReturn). Sign-in doesn't need this — it takes ?next= straight back.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = request.nextUrl.clone();
  url.search = "";
  url.pathname = "/sign-up";

  const response = NextResponse.redirect(url);
  // <Link> prefetches this route when the button scrolls into view; only an
  // actual click should remember the post.
  const prefetch = request.headers.has("next-router-prefetch");
  if (!prefetch && /^[0-9a-f-]{36}$/i.test(id)) {
    // Readable by the page so PostReturn can clear it after one use; it only
    // holds the id of a post the visitor already had the link to.
    response.cookies.set(POST_RETURN_COOKIE, id.toLowerCase(), {
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
  }
  return response;
}
