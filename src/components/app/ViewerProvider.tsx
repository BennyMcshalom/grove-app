"use client";

import { createContext, useContext, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { PresenceProvider } from "@/components/app/Presence";
import { UnreadProvider } from "@/components/app/Unread";
import type { Aura } from "@/lib/profile";

/**
 * The signed-in user as the app shell needs them: loaded once per request in
 * the (app) layout and shared with client components (Sidebar, Composer…).
 */
export interface ShellViewer {
  id: string;
  firstName: string;
  avatarUrl: string | null;
  aura: Aura;
  locationLabel: string | null;
  /** Open chapters, oldest first. */
  chapters: { id: string; slug: string; phase: string; openedAt: string }[];
  subscriptionStatus: "none" | "trialing" | "active" | "past_due" | "canceled" | "expired";
  trialEndsAt: string | null;
  unreadNotifications: number;
  /** Set while a Deep Focus session is running. */
  focusEndsAt: string | null;
  /** LiveKit is configured, so bond chats can place calls. */
  callsEnabled: boolean;
}

const ViewerContext = createContext<ShellViewer | null>(null);

export function useViewer() {
  const viewer = useContext(ViewerContext);
  if (!viewer) throw new Error("useViewer must be used inside the (app) layout");
  return viewer;
}

export function ViewerProvider({
  viewer,
  children,
}: {
  viewer: ShellViewer;
  children: React.ReactNode;
}) {
  return (
    <ViewerContext.Provider value={viewer}>
      <PresenceProvider userId={viewer.id}>
        <UnreadProvider userId={viewer.id} initial={viewer.unreadNotifications}>
          <FocusLock focusEndsAt={viewer.focusEndsAt} />
          {children}
        </UnreadProvider>
      </PresenceProvider>
    </ViewerContext.Provider>
  );
}

/**
 * "Grouv locks until you choose to return." While a session runs, every app
 * screen hands over to the Deep Focus page, which offers the way back.
 */
function FocusLock({ focusEndsAt }: { focusEndsAt: string | null }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!focusEndsAt || pathname === "/deep-focus") return;
    if (new Date(focusEndsAt).getTime() > Date.now()) router.replace("/deep-focus");
  }, [focusEndsAt, pathname, router]);

  return null;
}
