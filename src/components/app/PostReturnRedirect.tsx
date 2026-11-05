"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { POST_RETURN_COOKIE } from "@/lib/public-post-return";

/** Opens the post once and forgets it, so it never fires again. */
export function PostReturnRedirect({ id }: { id: string }) {
  const router = useRouter();

  useEffect(() => {
    document.cookie = `${POST_RETURN_COOKIE}=; Max-Age=0; path=/; SameSite=Lax`;
    if (window.location.pathname !== `/posts/${id}`) router.replace(`/posts/${id}`);
  }, [id, router]);

  return null;
}
