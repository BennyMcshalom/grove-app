"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import dynamic from "next/dynamic";
import { createContext, useCallback, useContext, useEffect, useEffectEvent, useMemo, useState } from "react";
import { Avatar } from "@/components/app/Avatar";
import { useToast } from "@/components/app/ToastProvider";
import { useViewer } from "@/components/app/ViewerProvider";
import { answerCall, hangUp, placeCall } from "@/lib/call-actions";
import { isLive, RING_TIMEOUT_MS, type Call, type CallConnection, type CallKind, type CallPeer, type CallStatus } from "@/lib/calls";
import { useRingTone } from "@/lib/ring-tone";
import { createClient, realtimeClient } from "@/lib/supabase/client";

// livekit-client is large; load it only when a call actually starts.
const CallScreen = dynamic(() => import("@/components/app/CallScreen").then((m) => m.CallScreen), { ssr: false });

interface CallContextValue {
  enabled: boolean;
  call: Call | null;
  startCall: (conversationId: string, kind: CallKind, peer: CallPeer) => Promise<void>;
}

const CallContext = createContext<CallContextValue>({
  enabled: false,
  call: null,
  startCall: async () => {},
});

export function useCalls() {
  return useContext(CallContext);
}

type CallRow = {
  id: string;
  conversation_id: string;
  caller_id: string | null;
  kind: CallKind;
  status: CallStatus;
  created_at: string;
};

/**
 * Voice and video calls between people in each other's circle. Rings arrive
 * over Supabase Realtime (the `calls` table); the call itself runs in a LiveKit
 * room. No Figma frames exist for calling, so the ringing card and the call
 * screen are designed to match the chat.
 */
export function CallProvider({ children }: { children: React.ReactNode }) {
  const viewer = useViewer();
  const toast = useToast();
  const [call, setCall] = useState<Call | null>(null);
  const [connection, setConnection] = useState<CallConnection | null>(null);
  const [incoming, setIncoming] = useState<Call | null>(null);

  const enabled = viewer.callsEnabled;

  const clearCall = useCallback(() => {
    setCall(null);
    setConnection(null);
  }, []);

  const onRow = useEffectEvent(async (row: CallRow, isInsert: boolean) => {
    if (call?.id === row.id) {
      if (isLive(row.status)) {
        setCall({ ...call, status: row.status });
        return;
      }
      clearCall();
      if (row.status === "declined") toast({ title: `${call.peer.name} can't talk right now` });
      else if (row.status === "missed" && call.callerId === viewer.id) toast({ title: "No answer" });
      return;
    }

    if (incoming?.id === row.id) {
      // Cancelled by the caller, or picked up on another device.
      if (row.status !== "ringing") setIncoming(null);
      return;
    }

    const ringingForMe = isInsert && row.status === "ringing" && row.caller_id && row.caller_id !== viewer.id;
    if (!ringingForMe || call) return;
    if (Date.now() - Date.parse(row.created_at) > RING_TIMEOUT_MS) return;
    // Deep Focus: the call shows up as missed in the chat instead.
    if (viewer.focusEndsAt && Date.parse(viewer.focusEndsAt) > Date.now()) return;

    const { data: caller } = await createClient()
      .from("profiles")
      .select("id, first_name, avatar_url")
      .eq("id", row.caller_id!)
      .single();
    setIncoming({
      id: row.id,
      conversationId: row.conversation_id,
      kind: row.kind,
      status: row.status,
      callerId: row.caller_id,
      peer: { userId: row.caller_id!, name: caller?.first_name ?? "Someone", avatarUrl: caller?.avatar_url ?? null },
    });
  });

  // RLS limits these to the viewer's own conversations, so the socket has to
  // be carrying the viewer's token before the channel joins — see
  // `realtimeClient`. An anonymous subscription is accepted and then never
  // delivers a ring.
  useEffect(() => {
    if (!enabled) return;
    let channel: RealtimeChannel | null = null;
    let cancelled = false;

    void realtimeClient().then((supabase) => {
      if (cancelled) return;
      channel = supabase
        .channel(`calls:${viewer.id}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "calls" }, (payload) => {
          const row = payload.new as Partial<CallRow>;
          if (row?.id) void onRow(row as CallRow, payload.eventType === "INSERT");
        })
        .subscribe();
    });

    return () => {
      cancelled = true;
      if (channel) void createClient().removeChannel(channel);
    };
  }, [enabled, viewer.id]);

  // Give up on an unanswered outgoing call — and ring back until then, so
  // the caller can hear that it is ringing at the other end.
  const outgoingRingingId = call && call.status === "ringing" && call.callerId === viewer.id ? call.id : null;
  useRingTone(outgoingRingingId !== null, "outgoing");

  useEffect(() => {
    if (!outgoingRingingId) return;
    const timer = setTimeout(() => {
      clearCall();
      toast({ title: "No answer" });
      void hangUp(outgoingRingingId);
    }, RING_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [outgoingRingingId, clearCall, toast]);

  // And stop ringing for one nobody picked up.
  const incomingId = incoming?.id ?? null;
  useEffect(() => {
    if (!incomingId) return;
    const timer = setTimeout(() => setIncoming(null), RING_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [incomingId]);

  const startCall = useCallback(
    async (conversationId: string, kind: CallKind, peer: CallPeer) => {
      if (call) {
        toast({ title: "You're already on a call", tone: "danger" });
        return;
      }
      const result = await placeCall(conversationId, kind);
      if (result.error || !result.call || !result.connection) {
        toast({ title: result.error ?? "We couldn't start that call.", tone: "danger" });
        return;
      }
      setIncoming((current) => (current?.id === result.call!.id ? null : current));
      setCall({ ...result.call, conversationId, peer });
      setConnection(result.connection);
    },
    [call, toast],
  );

  const accept = async () => {
    if (!incoming) return;
    const ringing = incoming;
    setIncoming(null);
    const result = await answerCall(ringing.id);
    if (result.error || !result.call || !result.connection) {
      toast({ title: result.error ?? "We couldn't pick that up.", tone: "danger" });
      return;
    }
    setCall({ ...ringing, status: result.call.status });
    setConnection(result.connection);
  };

  const decline = () => {
    if (!incoming) return;
    const id = incoming.id;
    setIncoming(null);
    void hangUp(id);
  };

  const end = useCallback(() => {
    if (!call) return;
    const id = call.id;
    clearCall();
    void hangUp(id);
  }, [call, clearCall]);

  const value = useMemo(() => ({ enabled, call, startCall }), [enabled, call, startCall]);

  return (
    <CallContext.Provider value={value}>
      {children}
      {incoming && !call && <IncomingCall call={incoming} onAccept={accept} onDecline={decline} />}
      {call && connection && (
        <CallScreen
          call={call}
          connection={connection}
          viewerId={viewer.id}
          onEnd={end}
          onMediaError={(message) => toast({ title: message, tone: "danger" })}
        />
      )}
    </CallContext.Provider>
  );
}

/** The ringing card, top of the screen, with a soft two-tone ring. */
function IncomingCall({ call, onAccept, onDecline }: { call: Call; onAccept: () => void; onDecline: () => void }) {
  useRingTone(true, "incoming");

  return (
    <div className="fixed inset-x-0 top-4 z-[60] flex justify-center px-4">
      <div
        role="alertdialog"
        aria-label={`${call.peer.name} is calling`}
        className="flex w-full max-w-md items-center gap-4 rounded-2xl bg-surface p-4 shadow-[0px_12px_32px_0px_rgba(23,23,23,0.18)]"
      >
        <Avatar src={call.peer.avatarUrl} name={call.peer.name} sizes="48px" className="size-12" />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-sans text-base font-semibold text-ink-700">{call.peer.name}</span>
          <span className="font-sans text-sm text-ink-300">
            Incoming {call.kind === "video" ? "video" : "voice"} call…
          </span>
        </div>
        <button
          type="button"
          onClick={onDecline}
          aria-label="Decline"
          className="grid size-11 place-items-center rounded-full bg-destructive-50 text-white transition-opacity hover:opacity-90"
        >
          <HangUpIcon />
        </button>
        <button
          type="button"
          onClick={onAccept}
          aria-label="Accept"
          className="grid size-11 place-items-center rounded-full bg-success-50 text-white transition-opacity hover:opacity-90"
        >
          <PhoneIcon />
        </button>
      </div>
    </div>
  );
}

export function PhoneIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M7 3.5 9 8l-2 1.5a11 11 0 0 0 6 6L14.5 13l4.5 2v3.5a2 2 0 0 1-2.2 2A17 17 0 0 1 3.5 5.7 2 2 0 0 1 5.5 3.5H7Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HangUpIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M3 13.5c5-4.5 13-4.5 18 0l-2 2.5-3.5-1.2v-2.3a10 10 0 0 0-7 0v2.3L5 16l-2-2.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
