"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Who's online — the green dots on avatars.
 *
 * Every signed-in tab joins one Realtime presence channel keyed by user id.
 * It carries nothing but the id, and any signed-in user can see who's online;
 * move to private channels if presence ever needs to be circle-only.
 */
const PresenceContext = createContext<ReadonlySet<string>>(new Set());

export function PresenceProvider({
  userId,
  children,
}: {
  userId: string;
  children: React.ReactNode;
}) {
  const [online, setOnline] = useState<ReadonlySet<string>>(() => new Set());

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel("presence:grouv", {
      config: { presence: { key: userId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        setOnline(new Set(Object.keys(channel.presenceState())));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  return <PresenceContext.Provider value={online}>{children}</PresenceContext.Provider>;
}

export function useIsOnline(userId: string | null | undefined) {
  const online = useContext(PresenceContext);
  return Boolean(userId && online.has(userId));
}
