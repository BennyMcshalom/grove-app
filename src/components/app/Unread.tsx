"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { useRealtimeChannel } from "@/lib/supabase/use-channel";

/** Called with the new notification's id as it arrives. */
type ArrivalListener = (notificationId: string) => void;

/**
 * The bell's unread count: starts from the server's number and goes up as new
 * notifications arrive over Realtime, until the panel is opened. The same one
 * subscription tells listeners (the in-app popups) what just arrived.
 */
const UnreadContext = createContext<{
  unread: number;
  clear: () => void;
  onArrival: (listener: ArrivalListener) => () => void;
}>({
  unread: 0,
  clear: () => {},
  onArrival: () => () => {},
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
  const listeners = useRef(new Set<ArrivalListener>());

  useRealtimeChannel(
    (supabase) =>
      supabase
        .channel(`notifications:${userId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
          (payload) => {
            setUnread((n) => n + 1);
            const id = (payload.new as { id?: unknown }).id;
            if (typeof id === "string") for (const listener of listeners.current) listener(id);
          },
        )
        .subscribe(),
    [userId],
  );

  const clear = useCallback(() => setUnread(0), []);
  const onArrival = useCallback((listener: ArrivalListener) => {
    listeners.current.add(listener);
    return () => {
      listeners.current.delete(listener);
    };
  }, []);
  const value = useMemo(() => ({ unread, clear, onArrival }), [unread, clear, onArrival]);
  return <UnreadContext.Provider value={value}>{children}</UnreadContext.Provider>;
}

export function useUnread() {
  return useContext(UnreadContext);
}
