import { cookies } from "next/headers";
import { PostReturnRedirect } from "@/components/app/PostReturnRedirect";
import { POST_RETURN_COOKIE } from "@/lib/public-post-return";

/**
 * Someone who joined from a shared post (/p/<id>/join) lands back on it the
 * first time they reach the app, after sign-up and onboarding.
 */
export async function PostReturn() {
  const id = (await cookies()).get(POST_RETURN_COOKIE)?.value;
  if (!id || !/^[0-9a-f-]{36}$/.test(id)) return null;
  return <PostReturnRedirect id={id} />;
}
