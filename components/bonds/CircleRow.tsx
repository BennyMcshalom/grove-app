'use client';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { formatRelativeTime, formatLastSeen, isOnline } from '@/lib/mappers';
import type { BondRecord } from '@/lib/api';

export function CircleRow({ bond, active, onClick, showDivider }: {
  bond: BondRecord; active: boolean; onClick: () => void; showDivider: boolean;
}) {
  const name = bond.otherUser?.displayName ?? 'Circle';
  const streak = bond.streakDays ?? 0;
  const pct = Math.min(100, Math.round((streak / 7) * 100));
  const unread = bond.unreadCount ?? 0;
  const inFocus = !!bond.otherUser?.deepFocusActive;
  const online = isOnline(bond.otherUser?.lastActiveAt);

  return (
    <button onClick={onClick} style={{
      display: 'block', width: '100%', textAlign: 'left', padding: '.6rem .6rem', borderRadius: 'var(--r-md)',
      background: active ? 'var(--ember-dim)' : 'transparent',
      borderBottom: showDivider ? '1px solid var(--border)' : 'none',
    }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--surf-low)'; }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '.7rem' }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <Avatar name={name} size={40} avatarUrl={bond.otherUser?.avatarUrl} aura={bond.otherUser?.aura ?? undefined} dot={online && !inFocus} />
          {inFocus && (
            <div title="In Deep Focus" style={{
              position: 'absolute', bottom: -1, right: -1,
              width: 14, height: 14, borderRadius: '50%', background: 'var(--ink)',
              border: '2px solid var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Icon name="moon" size={7} stroke="var(--cream)" sw={1.8} />
            </div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '.86rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
          <div style={{ fontSize: '.72rem', color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {inFocus ? 'in focus' : (bond.otherUser?.openTo || ' ')}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: '.66rem', color: 'var(--ink-4)', fontFamily: 'inherit' }}>
            {bond.lastMessageAt ? formatRelativeTime(bond.lastMessageAt) : 'new'}
          </div>
          {unread > 0 && (
            <span style={{
              display: 'inline-block', marginTop: 3, minWidth: 16, height: 16, lineHeight: '16px',
              borderRadius: 100, background: 'var(--ember)', color: '#fff', fontSize: '.6rem', fontWeight: 600,
              textAlign: 'center', padding: '0 4px'
            }}>{unread}</span>
          )}
        </div>
      </div>
      {/* Streak — fills toward the 7-day Bond threshold */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginTop: '.4rem', paddingLeft: 50 }}>
        <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'var(--surf-high)', overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${pct}%`,
            background: pct >= 85 ? 'var(--sage)' : 'var(--ink-4)',
            borderRadius: 2, transition: 'width .5s ease'
          }} />
        </div>
        <span style={{ fontSize: '.62rem', color: 'var(--ink-4)', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
          {formatLastSeen(bond.otherUser?.lastActiveAt)}
        </span>
      </div>
    </button>
  );
}
