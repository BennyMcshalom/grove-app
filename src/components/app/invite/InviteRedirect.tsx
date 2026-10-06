"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const SEEN = "grouv:chapter-invite-shown";

/** Opens the invitation card (/i/<token>), once per browser session. */
export function InviteRedirect({ token }: { token: string }) {
  const router = useRouter();

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SEEN) === token) return;
      sessionStorage.setItem(SEEN, token);
    } catch {
      // No session storage (private mode): showing it once per load is fine.
    }
    router.replace(`/i/${token}`);
  }, [token, router]);

  return null;
}
