"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const SEEN = "grouv:chapter-invite-shown";

/** Opens My Spaces with the invitation card, once per browser session. */
export function InviteRedirect({ token }: { token: string }) {
  const router = useRouter();

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SEEN) === token) return;
      sessionStorage.setItem(SEEN, token);
    } catch {
      // No session storage (private mode): showing it once per load is fine.
    }
    router.replace(`/spaces?invite=${token}`);
  }, [token, router]);

  return null;
}
