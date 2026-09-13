"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * The bell's unread count: starts from the server's number and goes up as new
 * notifications arrive over Realtime, until the panel is opened.
 */
const UnreadContext = createContext<{ unread: number; clear: () => void }>({
  unread: 0,
  clear: () => {},
});

export function UnreadProvider({
  userId,
  initial,
  children,
}: {
  userId: string;
  initial: number;
  children: React.ReactNode;
}) {
  const [unread, setUnread] = useState(initial);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => setUnread((n) => n + 1),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  const clear = useCallback(() => setUnread(0), []);
  const value = useMemo(() => ({ unread, clear }), [unread, clear]);
  return <UnreadContext.Provider value={value}>{children}</UnreadContext.Provider>;
}

export function useUnread() {
  return useContext(UnreadContext);
}
