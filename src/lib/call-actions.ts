"use server";

import { AccessToken } from "livekit-server-sdk";
import { requireOnboardedViewer } from "@/lib/auth/viewer";
import type { CallConnection, CallKind, CallStatus } from "@/lib/calls";
import { callsEnabled, roomForCall } from "@/lib/livekit";
import { createClient } from "@/lib/supabase/server";

type CallResult = {
  error?: string;
  call?: { id: string; status: CallStatus; callerId: string | null; kind: CallKind };
  connection?: CallConnection;
};

/** A LiveKit token for one call's room, valid long enough for a long call. */
async function connectionFor(callId: string, userId: string, name: string): Promise<CallConnection> {
  const token = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, {
    identity: userId,
    name,
    ttl: "6h",
  });
  // canUpdateOwnMetadata lets each side publish its public E2EE key (see call-e2ee.ts).
  token.addGrant({
    roomJoin: true,
    room: roomForCall(callId),
    canPublish: true,
    canSubscribe: true,
    canUpdateOwnMetadata: true,
  });
  return { url: process.env.LIVEKIT_URL!, token: await token.toJwt() };
}

/** Bond chat → phone or video icon. */
export async function placeCall(conversationId: string, kind: CallKind): Promise<CallResult> {
  const viewer = await requireOnboardedViewer();
  if (!callsEnabled()) return { error: "Calls aren't switched on yet." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("start_call", { p_conversation_id: conversationId, p_kind: kind });
  if (error || !data) {
    console.error("[calls] start_call failed", error);
    if (error?.hint === "rate_limited") return { error: error.message };
    if (error?.code === "42501") return { error: "You can only call people in your circle." };
    return { error: "We couldn't start that call. Try again." };
  }

  return {
    call: { id: data.id, status: data.status, callerId: data.caller_id, kind: data.kind },
    connection: await connectionFor(data.id, viewer.userId, viewer.profile.first_name),
  };
}

/** Incoming call → "Accept". */
export async function answerCall(callId: string): Promise<CallResult> {
  const viewer = await requireOnboardedViewer();
  if (!callsEnabled()) return { error: "Calls aren't switched on yet." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("answer_call", { p_call_id: callId });
  if (error || !data) {
    if (error?.hint === "call_over") return { error: "That call has already ended." };
    console.error("[calls] answer_call failed", error);
    return { error: "We couldn't pick that up. Try again." };
  }

  return {
    call: { id: data.id, status: data.status, callerId: data.caller_id, kind: data.kind },
    connection: await connectionFor(data.id, viewer.userId, viewer.profile.first_name),
  };
}

/** Hang up, cancel a call that's still ringing, or decline one. */
export async function hangUp(callId: string): Promise<{ error?: string }> {
  await requireOnboardedViewer();
  const supabase = await createClient();
  const { error } = await supabase.rpc("end_call", { p_call_id: callId });
  if (error) {
    console.error("[calls] end_call failed", error);
    return { error: "We couldn't end the call cleanly." };
  }
  return {};
}
