import "server-only";

/**
 * Calls run on LiveKit (open source; LiveKit Cloud's free Build plan covers
 * 5,000 WebRTC minutes a month, or self-host the server). Supabase holds the
 * ringing and call history; LiveKit carries the audio and video.
 */
export function callsEnabled() {
  return Boolean(process.env.LIVEKIT_URL && process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET);
}

const ROOM_PREFIX = "call-";

export const roomForCall = (callId: string) => `${ROOM_PREFIX}${callId}`;

export function callForRoom(roomName: string | undefined) {
  if (!roomName?.startsWith(ROOM_PREFIX)) return null;
  const id = roomName.slice(ROOM_PREFIX.length);
  return /^[0-9a-f-]{36}$/i.test(id) ? id : null;
}
