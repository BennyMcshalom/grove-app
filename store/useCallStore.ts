'use client';
import { create } from 'zustand';

export interface CallOtherUser { id: string; name: string; avatarUrl: string | null; }
export type CallKind = 'voice' | 'video';
export type CallStatus = 'idle' | 'outgoing' | 'incoming' | 'connecting' | 'connected';

interface CallState {
  status: CallStatus;
  callId: string | null;
  bondId: string | null;
  kind: CallKind | null;
  otherUser: CallOtherUser | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  muted: boolean;
  cameraOff: boolean;
  connectedAt: number | null;

  setOutgoing: (d: { bondId: string; kind: CallKind; otherUser: CallOtherUser }) => void;
  setCallId: (id: string) => void;
  setIncoming: (d: { callId: string; bondId: string; kind: CallKind; otherUser: CallOtherUser }) => void;
  setConnecting: () => void;
  setConnected: () => void;
  setLocalStream: (s: MediaStream | null) => void;
  setRemoteStream: (s: MediaStream | null) => void;
  setMuted: (v: boolean) => void;
  setCameraOff: (v: boolean) => void;
  reset: () => void;
}

const INITIAL = {
  status: 'idle' as CallStatus,
  callId: null,
  bondId: null,
  kind: null,
  otherUser: null,
  localStream: null,
  remoteStream: null,
  muted: false,
  cameraOff: false,
  connectedAt: null,
};

export const useCallStore = create<CallState>((set) => ({
  ...INITIAL,
  setOutgoing: (d) => set({ status: 'outgoing', bondId: d.bondId, kind: d.kind, otherUser: d.otherUser, callId: null }),
  setCallId: (id) => set({ callId: id }),
  setIncoming: (d) => set({ status: 'incoming', callId: d.callId, bondId: d.bondId, kind: d.kind, otherUser: d.otherUser }),
  setConnecting: () => set({ status: 'connecting' }),
  setConnected: () => set({ status: 'connected', connectedAt: Date.now() }),
  setLocalStream: (s) => set({ localStream: s }),
  setRemoteStream: (s) => set({ remoteStream: s }),
  setMuted: (v) => set({ muted: v }),
  setCameraOff: (v) => set({ cameraOff: v }),
  reset: () => set({ ...INITIAL }),
}));
