'use client';
import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { useToastStore } from '@/store/useToastStore';
import { ApiError, type GatheringRoom } from '@/lib/api';

// ── Gathering room card ────────────────────────────────────────────
export function RoomCard({ room, joined, onJoin, onLeave, onAlreadyJoined }: {
  room: GatheringRoom; joined: boolean;
  onJoin: () => Promise<void>; onLeave: () => Promise<void>;
  onAlreadyJoined?: () => void;
}) {
  const { toast } = useToastStore();
  const [busy, setBusy] = useState(false);
  const hoursLeft = Math.max(0, Math.round((new Date(room.expiresAt).getTime() - Date.now()) / 3_600_000));

  const handle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      joined ? await onLeave() : await onJoin();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // Already a member — sync local state silently
        onAlreadyJoined?.();
      } else {
        toast('Something went wrong. Try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card" style={{ padding: '1rem 1.2rem', marginBottom: '.7rem', boxShadow: 'var(--shadow-soft)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '.8rem' }}>
        <div style={{
          width: 42, height: 42, borderRadius: 12, background: joined ? 'var(--green-dim)' : 'var(--ember-dim)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background .2s'
        }}>
          <Icon name="pin" size={19} stroke={joined ? 'var(--green)' : 'var(--ember)'} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '.94rem' }}>{room.gatheringTag}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginTop: '.2rem' }}>
            <span className="chip" style={{ fontSize: '.64rem', padding: '.1rem .45rem', background: 'var(--surf-high)' }}>
              {room.memberCount} going
            </span>
            <span style={{ fontSize: '.68rem', color: 'var(--ink-4)' }}>
              {hoursLeft > 0 ? `${hoursLeft}h left` : 'Expiring soon'}
            </span>
          </div>
          {room.pinnedPrompt && (
            <p style={{ fontSize: '.8rem', color: 'var(--ink-3)', fontStyle: 'italic', marginTop: '.4rem', lineHeight: 1.4 }}>
              &ldquo;{room.pinnedPrompt}&rdquo;
            </p>
          )}
        </div>
        <button onClick={handle} disabled={busy}
          style={{
            padding: '.42rem .9rem', borderRadius: 100, fontSize: '.8rem', fontWeight: 600,
            flexShrink: 0, cursor: busy ? 'default' : 'pointer', transition: 'all .2s', whiteSpace: 'nowrap',
            background: joined ? 'var(--green-dim)' : 'var(--ember)',
            color: joined ? 'var(--green)' : '#fff',
            border: joined ? '1px solid rgba(46,107,58,.2)' : 'none',
            opacity: busy ? .6 : 1
          }}>
          {busy
            ? <Spinner size={12} color={joined ? 'var(--green)' : '#fff'} />
            : joined ? '✓ Going' : "I'll be there"}
        </button>
      </div>
    </div>
  );
}
