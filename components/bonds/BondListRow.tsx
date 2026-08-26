'use client';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { formatRelativeTime, isOnline } from '@/lib/mappers';
import type { BondRecord } from '@/lib/api';

export function BondListRow({ bond, active, onClick }: {
  bond: BondRecord; active: boolean; onClick: () => void;
}) {
  const name = bond.otherUser?.displayName ?? 'Bond';
  const inFocus = !!bond.otherUser?.deepFocusActive;
  const online = isOnline(bond.otherUser?.lastActiveAt);
  const unread = bond.unreadCount ?? 0;

  return (
    <button onClick={onClick} className="card" style={{
      display: 'block', width: '100%', textAlign: 'left', padding: '.9rem 1rem', marginBottom: '.6rem',
      borderLeft: active ? '4px solid var(--ember)' : '4px solid transparent',
      boxShadow: active ? 'var(--shadow)' : 'var(--shadow-soft)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '.7rem' }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <Avatar name={name} size={48} aura={bond.otherUser?.aura ?? undefined} avatarUrl={bond.otherUser?.avatarUrl} dot={online && !inFocus} />
          {inFocus && (
            <div title="In Deep Focus" style={{
              position: 'absolute', bottom: -1, right: -1,
              width: 16, height: 16, borderRadius: '50%', background: 'var(--ink)',
              border: '2px solid var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Icon name="moon" size={9} stroke="var(--cream)" sw={1.8} />
            </div>
          )}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '.5rem' }}>
            <span style={{ fontWeight: 600, fontSize: '.92rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
            <span style={{ fontSize: '.68rem', color: 'var(--ink-4)', flexShrink: 0, fontFamily: 'inherit' }}>
              {bond.lastMessageAt ? formatRelativeTime(bond.lastMessageAt) : 'new'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '.5rem', marginTop: 1 }}>
            {inFocus ? (
              <span style={{ fontSize: '.76rem', color: 'var(--ink-3)', fontStyle: 'italic' }}>in focus</span>
            ) : (
              <span style={{
                fontSize: '.78rem', color: 'var(--ink-4)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
              }}>
                {bond.otherUser?.openTo || 'No messages yet'}
              </span>
            )}
            {unread > 0 && (
              <span style={{
                display: 'inline-block', minWidth: 17, height: 17, lineHeight: '17px',
                borderRadius: 100, background: 'var(--ember)', color: '#fff', fontSize: '.62rem', fontWeight: 700,
                textAlign: 'center', padding: '0 4px', flexShrink: 0
              }}>{unread}</span>
            )}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginTop: '.65rem', paddingLeft: 58 }}>
        <span className="label-mono" style={{ fontSize: '.62rem', flexShrink: 0 }}>Depth</span>
        <div style={{ flex: 1 }}><ProgressBar value={bond.depthScore ?? 0} /></div>
      </div>
    </button>
  );
}
