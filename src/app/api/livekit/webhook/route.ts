import { WebhookReceiver } from "livekit-server-sdk";
import { callForRoom, callsEnabled } from "@/lib/livekit";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * LiveKit → Supabase. When a call's room empties out (someone closed the tab
 * instead of hanging up), the call is marked over. Point LiveKit Cloud's
 * webhook (Settings → Webhooks) at this URL; it signs with the API key.
 */
export async function POST(request: Request) {
  if (!callsEnabled()) return Response.json({ error: "Calls not configured" }, { status: 400 });

  const receiver = new WebhookReceiver(process.env.LIVEKIT_API_KEY!, process.env.LIVEKIT_API_SECRET!);
  let event;
  try {
    event = await receiver.receive(await request.text(), request.headers.get("authorization") ?? undefined);
  } catch (error) {
    console.warn("[calls] webhook verification failed", error);
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  if (event.event === "room_finished") {
    const callId = callForRoom(event.room?.name);
    if (callId) {
      const { error } = await createAdminClient().rpc("finish_call", { p_call_id: callId });
      if (error) {
        console.error("[calls] finish_call failed", error);
        return Response.json({ error: "Handler failed" }, { status: 500 });
      }
    }
  }

  return Response.json({ received: true });
}
