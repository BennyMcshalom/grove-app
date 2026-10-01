"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { InvitationModal } from "@/components/app/invite/InvitationModal";

/**
 * My Spaces opened with ?invite=<token> — from an invitation link (/i/<token>)
 * or after signing up through one. Shows the card, then drops the parameter.
 */
export function OpenInvitation({ token }: { token: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(true);

  if (!open) return null;
  return (
    <InvitationModal
      token={token}
      onClose={() => {
        setOpen(false);
        router.replace(pathname);
      }}
    />
  );
}
