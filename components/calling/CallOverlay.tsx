'use client';
import { useEffect, useRef, useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { useCallStore } from '@/store/useCallStore';
import { acceptCall, declineCall, hangUp, toggleMute, toggleCamera } from '@/lib/calling';

function useElapsed(connectedAt: number | null): string {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!connectedAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [connectedAt]);
  if (!connectedAt) return '0:00';
  const secs = Math.max(0, Math.floor((now - connectedAt) / 1000));
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
}

export function CallOverlay() {
  const { status, kind, otherUser, localStream, remoteStream, muted, cameraOff, connectedAt } = useCallStore();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const elapsed = useElapsed(connectedAt);

  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
  }, [localStream]);
  useEffect(() => {
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  if (status === 'idle' || !otherUser) return null;

  const name = otherUser.name;
  const isVideo = kind === 'video';
  const label =
    status === 'incoming' ? `Incoming ${isVideo ? 'video' : 'voice'} call` :
    status === 'outgoing' ? 'Calling…' :
    status === 'connecting' ? 'Connecting…' :
    `${isVideo ? 'Video' : 'Voice'} call · ${elapsed}`;

  return (
    <div className="fade-in" style={{
      position: 'fixed', inset: 0, zIndex: 9000, background: isVideo && status === 'connected' ? '#16231C' : 'rgba(26,26,26,.94)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* Remote video fills the background for connected video calls */}
      {isVideo && (
        <video ref={remoteVideoRef} autoPlay playsInline
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
            opacity: status === 'connected' && remoteStream ? 1 : 0, transition: 'opacity .3s' }}/>
      )}
      {!isVideo && <audio ref={remoteAudioRef} autoPlay/>}

      {isVideo && status === 'connected' && (
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 35%, rgba(78,125,94,.25), transparent 60%)' }}/>
      )}

      {/* Local self-view PIP for video calls */}
      {isVideo && localStream && !cameraOff && (
        <video ref={localVideoRef} autoPlay playsInline muted
          style={{ position: 'absolute', top: 24, right: 20, width: 96, height: 128, borderRadius: 14,
            objectFit: 'cover', border: '2px solid rgba(255,255,255,.15)', boxShadow: '0 6px 20px rgba(0,0,0,.4)' }}/>
      )}

      <div style={{ position: 'relative', textAlign: 'center', padding: '0 1.5rem' }}>
        {(!isVideo || status !== 'connected' || !remoteStream) && (
          <Avatar name={name} size={110} ring={2} avatarUrl={otherUser.avatarUrl} style={{ margin: '0 auto 1.3rem' }}/>
        )}
        <div className="serif" style={{ fontSize: '1.7rem', fontWeight: 600, color: '#fff' }}>{name}</div>
        <div className="mono" style={{ color: 'rgba(255,255,255,.6)', marginTop: '.35rem', fontSize: '.9rem' }}>{label}</div>

        {status === 'incoming' ? (
          <div style={{ display: 'flex', gap: '2.2rem', justifyContent: 'center', marginTop: '2.4rem' }}>
            <button onClick={declineCall} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.5rem' }}>
              <span style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--red)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 18px -4px rgba(186,26,26,.6)' }}>
                <Icon name="close" size={24} stroke="#fff"/>
              </span>
              <span style={{ color: 'rgba(255,255,255,.7)', fontSize: '.78rem' }}>Decline</span>
            </button>
            <button onClick={acceptCall} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.5rem' }}>
              <span style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--sage)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 18px -4px rgba(78,125,94,.6)' }}>
                <Icon name="phone" size={24} stroke="#fff"/>
              </span>
              <span style={{ color: 'rgba(255,255,255,.7)', fontSize: '.78rem' }}>Accept</span>
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2.4rem' }}>
            {status === 'connected' && (
              <button onClick={toggleMute} title={muted ? 'Unmute' : 'Mute'}
                style={{ width: 52, height: 52, borderRadius: '50%', background: muted ? '#fff' : 'rgba(255,255,255,.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={muted ? 'mic-off' : 'mic'} size={20} stroke={muted ? 'var(--ink)' : '#fff'}/>
              </button>
            )}
            {status === 'connected' && isVideo && (
              <button onClick={toggleCamera} title={cameraOff ? 'Turn camera on' : 'Turn camera off'}
                style={{ width: 52, height: 52, borderRadius: '50%', background: cameraOff ? '#fff' : 'rgba(255,255,255,.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="video" size={20} stroke={cameraOff ? 'var(--ink)' : '#fff'}/>
              </button>
            )}
            <button onClick={hangUp} title="End call" style={{ width: 58, height: 58, borderRadius: '50%',
              background: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 6px 18px -4px rgba(186,26,26,.6)' }}>
              <Icon name="phone" size={24} stroke="#fff"/>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
