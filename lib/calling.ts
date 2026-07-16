'use client';
// WebRTC call manager — owns the signaling WebSocket and the peer connection
// lifecycle. Deliberately kept outside React (a module-level singleton, since
// there's only ever one active call) to avoid stale-closure bugs; useCallStore
// is the reactive bridge components read from.
import { useCallStore, type CallKind } from '@/store/useCallStore';
import { useToastStore } from '@/store/useToastStore';
import { authApi, callsApi, type BondRecord } from './api';

const WS_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080').replace(/^http/, 'ws');

let ws: WebSocket | null = null;
let pc: RTCPeerConnection | null = null;
let localStream: MediaStream | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;
let manuallyClosed = true;
let ringAudio: { osc: OscillatorNode; gain: GainNode; ctx: AudioContext } | null = null;

function toast(msg: string) {
  useToastStore.getState().toast(msg);
}

// ── Signaling transport ─────────────────────────────────────────────────
async function connect(): Promise<void> {
  if (manuallyClosed) return;
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;

  try {
    const { ticket } = await authApi.wsTicket();
    const socket = new WebSocket(`${WS_BASE}/ws?ticket=${encodeURIComponent(ticket)}`);
    ws = socket;

    socket.onopen = () => { reconnectAttempts = 0; };
    socket.onmessage = (ev) => {
      try { handleMessage(JSON.parse(ev.data)); } catch { /* ignore malformed */ }
    };
    socket.onclose = () => {
      if (ws === socket) ws = null;
      if (!manuallyClosed) scheduleReconnect();
    };
    socket.onerror = () => {};
  } catch {
    scheduleReconnect();
  }
}

function scheduleReconnect(): void {
  if (reconnectTimer || manuallyClosed) return;
  const delay = Math.min(30_000, 1000 * 2 ** reconnectAttempts);
  reconnectAttempts++;
  reconnectTimer = setTimeout(() => { reconnectTimer = null; connect(); }, delay);
}

function send(event: string, payload?: unknown): void {
  if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ event, payload }));
}

// connect() resolves once the ticket is fetched and the socket object exists —
// NOT once it's actually open. Calling send() right after connect() (without
// awaiting the handshake) silently drops the message if the socket is still
// CONNECTING, which is exactly what happens on a cold start or right after a
// reconnect. Every user-triggered action below waits for a truly open socket
// (or fails loudly) instead of firing into the void.
function waitForOpen(timeoutMs = 6000): Promise<boolean> {
  return new Promise((resolve) => {
    const start = Date.now();
    const check = () => {
      if (ws?.readyState === WebSocket.OPEN) { resolve(true); return; }
      if (Date.now() - start > timeoutMs) { resolve(false); return; }
      setTimeout(check, 150);
    };
    check();
  });
}

async function sendReliable(event: string, payload?: unknown): Promise<boolean> {
  await connect();
  const ok = await waitForOpen();
  if (ok) send(event, payload);
  return ok;
}

let visibilityBound = false;
export function initCalling(): void {
  manuallyClosed = false;
  connect();
  if (typeof window !== 'undefined' && !visibilityBound) {
    visibilityBound = true;
    window.addEventListener('online', () => connect());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') connect();
    });
  }
}

export function stopCalling(): void {
  manuallyClosed = true;
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  ws?.close();
  ws = null;
}

// ── Ringtone — plays on both sides: a pulsing tone for the callee while
// incoming, and the same tone for the caller while waiting ("ringback").
function startRingtone(pulseMs = 1500): void {
  if (ringAudio || typeof window === 'undefined') return;
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    // AudioContext can start life 'suspended' when created outside a direct
    // user-gesture handler (exactly the case here — it's created from an
    // async WS message handler) and will never make a sound until resumed.
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 640;
    gain.gain.value = 0;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    ringAudio = { osc, gain, ctx };
    const pulse = () => {
      if (!ringAudio) return;
      if (ringAudio.ctx.state === 'suspended') ringAudio.ctx.resume().catch(() => {});
      const t = ringAudio.ctx.currentTime;
      ringAudio.gain.gain.cancelScheduledValues(t);
      ringAudio.gain.gain.setValueAtTime(0, t);
      ringAudio.gain.gain.linearRampToValueAtTime(0.12, t + 0.05);
      ringAudio.gain.gain.linearRampToValueAtTime(0, t + 0.4);
    };
    pulse();
    const interval = setInterval(() => {
      if (!ringAudio) { clearInterval(interval); return; }
      pulse();
    }, pulseMs);
  } catch { /* audio unsupported/blocked — silent ring is fine */ }
}

function stopRingtone(): void {
  if (!ringAudio) return;
  try { ringAudio.osc.stop(); ringAudio.ctx.close(); } catch {}
  ringAudio = null;
}

// ── WebRTC media/peer connection ────────────────────────────────────────
async function getIceServers(): Promise<RTCIceServer[]> {
  try {
    const { iceServers } = await callsApi.iceServers();
    return iceServers as RTCIceServer[];
  } catch {
    return [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];
  }
}

async function ensureLocalStream(kind: CallKind): Promise<MediaStream> {
  if (localStream) return localStream;
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: kind === 'video' });
  localStream = stream;
  useCallStore.getState().setLocalStream(stream);
  return stream;
}

function createPeerConnection(iceServers: RTCIceServer[]): RTCPeerConnection {
  const conn = new RTCPeerConnection({ iceServers });
  conn.onicecandidate = (e) => {
    const callId = useCallStore.getState().callId;
    if (e.candidate && callId) send('call:ice-candidate', { callId, candidate: e.candidate });
  };
  conn.ontrack = (e) => {
    useCallStore.getState().setRemoteStream(e.streams[0] ?? null);
  };
  return conn;
}

function cleanupPeerConnection(): void {
  pc?.close();
  pc = null;
  localStream?.getTracks().forEach(t => t.stop());
  localStream = null;
  useCallStore.getState().setLocalStream(null);
  useCallStore.getState().setRemoteStream(null);
  stopRingtone();
}

// Caller side — runs once the callee accepts.
async function createOfferAndSend(): Promise<void> {
  const s = useCallStore.getState();
  if (!s.kind || !s.callId) return;
  try {
    const stream = await ensureLocalStream(s.kind);
    const iceServers = await getIceServers();
    pc = createPeerConnection(iceServers);
    stream.getTracks().forEach(track => pc!.addTrack(track, stream));
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    send('call:offer', { callId: s.callId, sdp: offer });
    useCallStore.getState().setConnecting();
  } catch {
    toast('Could not access microphone/camera.');
    hangUp();
  }
}

// Callee side — runs on receiving the offer (i.e. right after we accepted).
async function handleOffer(sdp: RTCSessionDescriptionInit): Promise<void> {
  const s = useCallStore.getState();
  if (!s.kind || !s.callId) return;
  try {
    const stream = await ensureLocalStream(s.kind);
    const iceServers = await getIceServers();
    pc = createPeerConnection(iceServers);
    stream.getTracks().forEach(track => pc!.addTrack(track, stream));
    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    send('call:answer', { callId: s.callId, sdp: answer });
    useCallStore.getState().setConnected();
  } catch {
    toast('Could not access microphone/camera.');
    declineCall();
  }
}

// ── Message handling ────────────────────────────────────────────────────
interface CallInvitePayload { callId: string; bondId: string; kind: CallKind; fromUserId: string; fromName: string; fromAvatarUrl: string | null; }

function handleMessage(msg: { event: string; payload?: unknown }): void {
  const { event, payload } = msg;
  switch (event) {
    case 'call:ringing': {
      const p = payload as { callId: string };
      useCallStore.getState().setCallId(p.callId);
      break;
    }
    case 'call:invite': {
      const p = payload as CallInvitePayload;
      if (useCallStore.getState().status !== 'idle') { send('call:decline', { callId: p.callId }); return; }
      useCallStore.getState().setIncoming({
        callId: p.callId, bondId: p.bondId, kind: p.kind,
        otherUser: { id: p.fromUserId, name: p.fromName, avatarUrl: p.fromAvatarUrl },
      });
      startRingtone();
      break;
    }
    case 'call:accept': {
      stopRingtone();
      createOfferAndSend();
      break;
    }
    case 'call:offer': {
      const p = payload as { sdp: RTCSessionDescriptionInit };
      handleOffer(p.sdp);
      break;
    }
    case 'call:answer': {
      const p = payload as { sdp: RTCSessionDescriptionInit };
      pc?.setRemoteDescription(new RTCSessionDescription(p.sdp))
        .then(() => useCallStore.getState().setConnected())
        .catch(() => {});
      break;
    }
    case 'call:ice-candidate': {
      const p = payload as { candidate: RTCIceCandidateInit };
      pc?.addIceCandidate(new RTCIceCandidate(p.candidate)).catch(() => {});
      break;
    }
    case 'call:busy': {
      stopRingtone();
      cleanupPeerConnection();
      useCallStore.getState().reset();
      toast("They're on another call.");
      break;
    }
    case 'call:end': {
      const p = payload as { reason?: string };
      const wasRinging = useCallStore.getState().status === 'outgoing';
      stopRingtone();
      cleanupPeerConnection();
      useCallStore.getState().reset();
      if (p?.reason === 'declined') toast('Call declined.');
      else if (p?.reason === 'timeout' && wasRinging) toast('No answer.');
      break;
    }
    case 'call:error': {
      const p = payload as { message?: string };
      stopRingtone();
      cleanupPeerConnection();
      useCallStore.getState().reset();
      toast(p?.message ?? 'Call failed.');
      break;
    }
  }
}

// ── Public actions (called from UI) ─────────────────────────────────────
export async function startCall(bond: BondRecord, kind: CallKind): Promise<void> {
  if (!bond.otherUser) return;
  if (useCallStore.getState().status !== 'idle') return;
  useCallStore.getState().setOutgoing({
    bondId: bond.id, kind,
    otherUser: { id: bond.otherUser.id, name: bond.otherUser.displayName, avatarUrl: bond.otherUser.avatarUrl },
  });
  startRingtone(); // ringback while we wait for them to answer
  const ok = await sendReliable('call:invite', { bondId: bond.id, kind });
  if (!ok) {
    stopRingtone();
    toast('Could not reach the server. Check your connection and try again.');
    useCallStore.getState().reset();
  }
}

export async function acceptCall(): Promise<void> {
  const s = useCallStore.getState();
  if (s.status !== 'incoming' || !s.callId) return;
  stopRingtone();
  useCallStore.getState().setConnecting();
  const ok = await sendReliable('call:accept', { callId: s.callId });
  if (!ok) {
    toast('Could not reach the server. Check your connection and try again.');
    useCallStore.getState().reset();
  }
}

export function declineCall(): void {
  const s = useCallStore.getState();
  stopRingtone();
  // Best-effort — clean up locally regardless of whether this reaches the
  // server, so the UI never gets stuck waiting on a flaky connection.
  if (s.callId) void sendReliable('call:decline', { callId: s.callId });
  cleanupPeerConnection();
  useCallStore.getState().reset();
}

export function hangUp(): void {
  const s = useCallStore.getState();
  if (s.callId) void sendReliable('call:end', { callId: s.callId });
  cleanupPeerConnection();
  useCallStore.getState().reset();
}

export function toggleMute(): void {
  const track = localStream?.getAudioTracks()[0];
  if (!track) return;
  track.enabled = !track.enabled;
  useCallStore.getState().setMuted(!track.enabled);
}

export function toggleCamera(): void {
  const track = localStream?.getVideoTracks()[0];
  if (!track) return;
  track.enabled = !track.enabled;
  useCallStore.getState().setCameraOff(!track.enabled);
}
