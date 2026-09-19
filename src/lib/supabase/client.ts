"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { supabasePublishableKey, supabaseUrl } from "./env";

let browserClient: SupabaseClient<Database> | undefined;

/**
 * Supabase client for Client Components — Realtime subscriptions and direct
 * uploads. Mutations should normally go through Server Actions instead.
 *
 * One client per tab: each one opens its own Realtime socket, and a second
 * socket would re-subscribe every channel for nothing.
 */
export function createClient() {
  browserClient ??= createBrowserClient<Database>(supabaseUrl(), supabasePublishableKey());
  return browserClient;
}

/**
 * The same client, once Realtime is carrying the viewer's token.
 *
 * A channel joins with whatever token the socket holds at that moment. A
 * client that hasn't finished reading the session from cookies still holds
 * only the publishable key, so the server subscribes it as `anon` — and every
 * table here is behind RLS, so the subscription succeeds and then never
 * delivers a single row. Subscriptions must await this, not `createClient()`.
 */
export async function realtimeClient() {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  if (data.session) await supabase.realtime.setAuth(data.session.access_token);
  return supabase;
}
