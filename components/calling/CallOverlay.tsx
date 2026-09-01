'use client';
import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { useCallStore } from '@/store/useCallStore';
import { acceptCall, declineCall, hangUp, toggleMute, toggleCamera } from '@/lib/calling';
import styles from './CallOverlay.module.css';

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
    <div className={clsx('fade-in', styles.overlay, isVideo && status === 'connected' && styles.videoConnected)}>
      {/* Remote video fills the background for connected video calls */}
      {isVideo && (
        <video ref={remoteVideoRef} autoPlay playsInline
          className={clsx(styles.remoteVideo, status === 'connected' && remoteStream && styles.visible)}/>
      )}
      {!isVideo && <audio ref={remoteAudioRef} autoPlay/>}

      {isVideo && status === 'connected' && (
        <div className={styles.videoGlow}/>
      )}

      {/* Local self-view PIP for video calls */}
      {isVideo && localStream && !cameraOff && (
        <video ref={localVideoRef} autoPlay playsInline muted className={styles.localPip}/>
      )}

      <div className={styles.center}>
        {(!isVideo || status !== 'connected' || !remoteStream) && (
          <Avatar name={name} size={110} ring={2} avatarUrl={otherUser.avatarUrl} style={{ margin: '0 auto 1.3rem' }}/>
        )}
        <div className={clsx('serif', styles.name)}>{name}</div>
        <div className={clsx('mono', styles.label)}>{label}</div>

        {status === 'incoming' ? (
          <div className={styles.incomingRow}>
            <button onClick={declineCall} className={styles.incomingBtn}>
              <span className={clsx(styles.incomingCircle, styles.declineCircle)}>
                <Icon name="close" size={24} stroke="#fff"/>
              </span>
              <span className={styles.incomingLabel}>Decline</span>
            </button>
            <button onClick={acceptCall} className={styles.incomingBtn}>
              <span className={clsx(styles.incomingCircle, styles.acceptCircle)}>
                <Icon name="phone" size={24} stroke="#fff"/>
              </span>
              <span className={styles.incomingLabel}>Accept</span>
            </button>
          </div>
        ) : (
          <div className={styles.controlsRow}>
            {status === 'connected' && (
              <button onClick={toggleMute} title={muted ? 'Unmute' : 'Mute'}
                className={clsx(styles.controlBtn, muted && styles.active)}>
                <Icon name={muted ? 'mic-off' : 'mic'} size={20} stroke={muted ? 'var(--ink)' : '#fff'}/>
              </button>
            )}
            {status === 'connected' && isVideo && (
              <button onClick={toggleCamera} title={cameraOff ? 'Turn camera on' : 'Turn camera off'}
                className={clsx(styles.controlBtn, cameraOff && styles.active)}>
                <Icon name="video" size={20} stroke={cameraOff ? 'var(--ink)' : '#fff'}/>
              </button>
            )}
            <button onClick={hangUp} title="End call" className={styles.hangUpBtn}>
              <Icon name="phone" size={24} stroke="#fff"/>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
