export type CallKind = "audio" | "video";
export type CallStatus = "ringing" | "active" | "ended" | "missed" | "declined";

export interface CallPeer {
  userId: string;
  name: string;
  avatarUrl: string | null;
}

/** A call the viewer is placing, has picked up, or is being rung for. */
export interface Call {
  id: string;
  conversationId: string;
  kind: CallKind;
  status: CallStatus;
  callerId: string | null;
  peer: CallPeer;
}

/** Where the browser joins the call's LiveKit room. */
export interface CallConnection {
  url: string;
  token: string;
}

/** Unanswered rings give up after this long (the database agrees). */
export const RING_TIMEOUT_MS = 45_000;

export const isLive = (status: CallStatus) => status === "ringing" || status === "active";
