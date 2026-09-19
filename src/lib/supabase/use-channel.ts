"use client";

import { useEffect } from "react";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { createClient, realtimeClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Keeps a Realtime channel open while the component is mounted.
 *
 * Every table this app subscribes to is behind RLS, so the socket has to be
 * carrying the viewer's token before the channel joins — otherwise the server
 * subscribes it as `anon`, reports success, and silently delivers nothing.
 * Building the channel through this hook is what guarantees the order.
 *
 * Return null from `build` to subscribe to nothing this time round.
 */
export function useRealtimeChannel(
  build: (supabase: SupabaseClient<Database>) => RealtimeChannel | null,
  deps: React.DependencyList,
) {
  useEffect(() => {
    let channel: RealtimeChannel | null = null;
    let cancelled = false;

    void realtimeClient().then((supabase) => {
      if (cancelled) return;
      channel = build(supabase);
    });

    return () => {
      cancelled = true;
      if (channel) void createClient().removeChannel(channel);
    };
    // The caller lists what the channel depends on; `build` is read fresh each time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
