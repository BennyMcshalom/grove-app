"use client";

import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useToast } from "@/components/app/ToastProvider";
import { loadUnreadMessages } from "@/lib/notification-actions";
import { useRealtimeChannel } from "@/lib/supabase/use-channel";

/**
 * Unread chat messages, for the badge on Bonds. Chat messages don't create
 * notifications, so without this nothing told anyone a message had arrived.
 *
 * Starts from the server's count and re-reads it whenever a message lands
 * (Realtime only delivers messages from the viewer's own chats) or one of
 * their chats is marked read. Away from Bonds, a new message also shows a
 * toast.
 */
const UnreadMessagesContext = createContext(0);

export function UnreadMessagesProvider({
  userId,
  initial,
  children,
}: {
  userId: string;
  initial: number;
  children: React.ReactNode;
}) {
  const toast = useToast();
  const pathname = usePathname();
  const [count, setCount] = useState(initial);
  const onBonds = useRef(false);
  useEffect(() => {
    onBonds.current = pathname.startsWith("/bonds");
  }, [pathname]);

  const countRef = useRef(initial);
  useEffect(() => {
    countRef.current = count;
  }, [count]);

  const refresh = useCallback(async (announce: boolean) => {
    const result = await loadUnreadMessages();
    // Only a real new unread (not a muted chat) is worth a toast.
    const grew = result.unread > countRef.current;
    setCount(result.unread);
    if (announce && grew && result.latestSender && !onBonds.current) {
      toast({ title: `New message from ${result.latestSender}` });
    }
  }, [toast]);

  // Reading a chat on the Bonds page clears its messages.
  useEffect(() => {
    let live = true;
    void loadUnreadMessages().then((result) => {
      if (live) setCount(result.unread);
    });
    return () => {
      live = false;
    };
  }, [pathname]);

  useRealtimeChannel(
    (supabase) =>
      supabase
        .channel(`unread-messages:${userId}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
          const row = payload.new as { sender_id: string | null };
          if (row.sender_id && row.sender_id !== userId) void refresh(true);
        })
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "conversation_members", filter: `user_id=eq.${userId}` },
          () => void refresh(false),
        )
        .subscribe(),
    [userId, refresh],
  );

  return <UnreadMessagesContext.Provider value={count}>{children}</UnreadMessagesContext.Provider>;
}

export function useUnreadMessages() {
  return useContext(UnreadMessagesContext);
}

/** The small count on the Bonds nav item. */
export function NavCount({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      aria-label={`${count} unread`}
      className={
        "grid min-w-5 place-items-center rounded-full bg-primary-500 px-1.5 font-sans text-[11px] leading-5 font-semibold text-white " +
        (className ?? "")
      }
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
