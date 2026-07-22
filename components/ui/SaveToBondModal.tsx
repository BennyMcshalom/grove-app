'use client';
import { useState } from 'react';
import { Icon } from './Icon';
import { Avatar } from './Avatar';
import { Spinner } from './Spinner';
import { useToastStore } from '@/store/useToastStore';
import { useBonds, useSharePostToBond } from '@/hooks/useBonds';

// Picks a connection (circle or Bond — anyone in useBonds()) to send a post
// to, as a shared_post message in their existing chat thread.
export function SaveToBondModal({ postId, onClose }: { postId: string; onClose: () => void }) {
  const { toast } = useToastStore();
  const { data: bonds, isLoading } = useBonds();
  const share = useSharePostToBond();
  const [sentTo, setSentTo] = useState<string | null>(null);

  const send = async (bondId: string, name: string) => {
    try {
      await share.mutateAsync({ bondId, postId });
      setSentTo(bondId);
      toast(`Saved to your chat with ${name}.`);
      setTimeout(onClose, 700);
    } catch { toast('Could not save. Try again.'); }
  };

  const connections = bonds ?? [];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(26,26,26,.55)',
      backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1.5rem'
    }}
      onClick={onClose}>
      <div className="rise" style={{
        width: 'min(380px, 94vw)', maxHeight: '80vh', overflowY: 'auto',
        background: 'var(--cream)', borderRadius: 20, boxShadow: 'var(--shadow-lg)'
      }}
        onClick={e => e.stopPropagation()}>
        <div style={{ padding: '1.2rem 1.3rem .4rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 className="serif" style={{ fontSize: '1.15rem', fontWeight: 600 }}>Save to a Bond</h3>
          <button onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="close" size={16} stroke="var(--ink-3)"/>
          </button>
        </div>
        <div style={{ padding: '.6rem 1rem 1.2rem' }}>
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem 0' }}><Spinner/></div>
          ) : connections.length === 0 ? (
            <p style={{ fontSize: '.86rem', color: 'var(--ink-3)', textAlign: 'center', padding: '1.5rem 0' }}>
              You don&apos;t have anyone in your circle yet.
            </p>
          ) : (
            connections.map(b => {
              const sent = sentTo === b.id;
              const firstName = b.otherUser?.displayName?.split(' ')[0] ?? 'them';
              return (
                <button key={b.id} onClick={() => send(b.id, firstName)}
                  disabled={share.isPending}
                  style={{
                    display: 'flex', width: '100%', alignItems: 'center', gap: '.7rem', padding: '.6rem .5rem',
                    borderRadius: 'var(--r-md)', textAlign: 'left'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surf-low)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <Avatar name={b.otherUser?.displayName ?? ''} size={38} avatarUrl={b.otherUser?.avatarUrl} aura={b.otherUser?.aura ?? undefined}/>
                  <span style={{ flex: 1, fontWeight: 500, fontSize: '.9rem' }}>{b.otherUser?.displayName ?? 'Someone'}</span>
                  {sent && <Icon name="check" size={16} stroke="var(--sage)"/>}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
