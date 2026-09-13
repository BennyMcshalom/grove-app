"use client";

import { Room, RoomEvent, Track, type LocalTrackPublication, type RemoteTrack } from "livekit-client";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/app/Avatar";
import { HangUpIcon } from "@/components/app/CallProvider";
import { cn } from "@/lib/cn";
import type { Call, CallConnection } from "@/lib/calls";

const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

/**
 * The call itself: the other person's video (or their photo on a voice call),
 * your own preview in the corner, and mute / camera / hang up.
 */
export function CallScreen({
  call,
  connection,
  viewerId,
  onEnd,
  onMediaError,
}: {
  call: Call;
  connection: CallConnection;
  viewerId: string;
  onEnd: () => void;
  onMediaError: (message: string) => void;
}) {
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLDivElement>(null);
  const roomRef = useRef<Room | null>(null);

  const [phase, setPhase] = useState<"connecting" | "waiting" | "live" | "reconnecting">("connecting");
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(call.kind === "video");
  const [remoteVideo, setRemoteVideo] = useState(false);
  const [seconds, setSeconds] = useState(0);

  // Keep the latest handlers without reconnecting when they change.
  const handlers = useRef({ onEnd, onMediaError });
  useEffect(() => {
    handlers.current = { onEnd, onMediaError };
  });

  useEffect(() => {
    const room = new Room({ adaptiveStream: true, dynacast: true });
    roomRef.current = room;
    let cancelled = false;

    const attachRemote = (track: RemoteTrack) => {
      if (track.kind === Track.Kind.Video && remoteVideoRef.current) {
        track.attach(remoteVideoRef.current);
        setRemoteVideo(true);
      } else if (track.kind === Track.Kind.Audio && audioRef.current) {
        audioRef.current.appendChild(track.attach());
      }
    };

    const showLocal = (publication: LocalTrackPublication) => {
      if (publication.source === Track.Source.Camera && publication.track && localVideoRef.current) {
        publication.track.attach(localVideoRef.current);
      }
    };

    const syncPhase = () => {
      if (!cancelled) setPhase(room.remoteParticipants.size > 0 ? "live" : "waiting");
    };

    room
      .on(RoomEvent.TrackSubscribed, attachRemote)
      .on(RoomEvent.TrackUnsubscribed, (track) => {
        track.detach().forEach((element) => {
          if (element !== remoteVideoRef.current) element.remove();
        });
        if (track.kind === Track.Kind.Video) setRemoteVideo(false);
      })
      .on(RoomEvent.LocalTrackPublished, showLocal)
      .on(RoomEvent.ParticipantConnected, syncPhase)
      // In a one-to-one call, the other person leaving ends it. LiveKit has
      // already tried to reconnect them by the time this fires.
      .on(RoomEvent.ParticipantDisconnected, () => handlers.current.onEnd())
      .on(RoomEvent.Reconnecting, () => setPhase("reconnecting"))
      .on(RoomEvent.Reconnected, syncPhase)
      .on(RoomEvent.Disconnected, () => {
        if (!cancelled) handlers.current.onEnd();
      })
      .on(RoomEvent.MediaDevicesError, () =>
        handlers.current.onMediaError(
          call.kind === "video"
            ? "Allow camera and microphone access to be seen and heard."
            : "Allow microphone access to be heard.",
        ),
      );

    (async () => {
      try {
        await room.connect(connection.url, connection.token);
        if (cancelled) return;
        syncPhase();
        await room.localParticipant.setMicrophoneEnabled(true);
        if (call.kind === "video") await room.localParticipant.setCameraEnabled(true);
      } catch (error) {
        if (cancelled) return;
        console.error("[calls] couldn't join the call", error);
        const denied = error instanceof Error && error.name === "NotAllowedError";
        handlers.current.onMediaError(
          denied ? "Allow microphone access to be heard." : "We couldn't connect the call. Check your connection.",
        );
        if (!denied) handlers.current.onEnd();
      }
    })();

    return () => {
      cancelled = true;
      roomRef.current = null;
      void room.disconnect();
    };
  }, [call.id, call.kind, connection.url, connection.token]);

  // Call timer, from when both people are in.
  useEffect(() => {
    if (phase !== "live") return;
    const started = Date.now();
    const timer = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [phase]);

  const toggleMic = async () => {
    const next = !micOn;
    setMicOn(next);
    await roomRef.current?.localParticipant.setMicrophoneEnabled(next);
  };

  const toggleCamera = async () => {
    const next = !cameraOn;
    setCameraOn(next);
    try {
      await roomRef.current?.localParticipant.setCameraEnabled(next);
    } catch {
      setCameraOn(!next);
      onMediaError("Allow camera access to turn your video on.");
    }
  };

  const outgoing = call.callerId === viewerId;
  const status =
    phase === "reconnecting"
      ? "Reconnecting…"
      : phase === "live"
        ? clock(seconds)
        : call.status === "ringing" && outgoing
          ? "Calling…"
          : "Connecting…";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Call with ${call.peer.name}`}
      className="fixed inset-0 z-[70] flex flex-col bg-[#1c1917] text-white"
    >
      <div ref={audioRef} className="hidden" />

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={cn("absolute inset-0 size-full object-cover", !remoteVideo && "hidden")}
        />

        {!remoteVideo && (
          <div className="flex size-full flex-col items-center justify-center gap-4 px-6 text-center">
            <span className={cn("rounded-full p-1", phase !== "live" && "animate-pulse")}>
              <Avatar src={call.peer.avatarUrl} name={call.peer.name} sizes="112px" className="size-28" />
            </span>
            <span className="font-sans text-2xl font-semibold">{call.peer.name}</span>
            <span className="font-sans text-base text-white/70" suppressHydrationWarning>
              {status}
            </span>
          </div>
        )}

        {remoteVideo && (
          <div className="absolute top-4 left-4 rounded-full bg-black/40 px-3 py-1.5 font-sans text-sm">
            {call.peer.name} · {status}
          </div>
        )}

        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className={cn(
            "absolute right-4 bottom-4 aspect-[3/4] w-28 rounded-xl bg-black object-cover shadow-lg sm:w-40 -scale-x-100",
            !cameraOn && "hidden",
          )}
        />
      </div>

      <div className="flex shrink-0 items-center justify-center gap-5 px-4 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <ControlButton label={micOn ? "Mute" : "Unmute"} active={micOn} onClick={toggleMic}>
          <MicIcon off={!micOn} />
        </ControlButton>
        <ControlButton label={cameraOn ? "Turn camera off" : "Turn camera on"} active={cameraOn} onClick={toggleCamera}>
          <CameraIcon off={!cameraOn} />
        </ControlButton>
        <button
          type="button"
          onClick={onEnd}
          aria-label="Hang up"
          className="grid size-14 place-items-center rounded-full bg-destructive-50 transition-opacity hover:opacity-90"
        >
          <HangUpIcon className="size-6" />
        </button>
      </div>
    </div>
  );
}

function ControlButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={!active}
      className={cn(
        "grid size-14 place-items-center rounded-full transition-colors",
        active ? "bg-white/15 hover:bg-white/25" : "bg-white text-[#1c1917]",
      )}
    >
      {children}
    </button>
  );
}

function MicIcon({ off }: { off: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-6" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      {off && <path d="m4 4 16 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />}
    </svg>
  );
}

function CameraIcon({ off }: { off: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-6" aria-hidden="true">
      <rect x="3" y="6" width="12" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="m15 11 5-3v8l-5-3v-2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      {off && <path d="m3 3 18 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />}
    </svg>
  );
}
