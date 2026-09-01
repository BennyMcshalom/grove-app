'use client';
import { useState } from 'react';
import clsx from 'clsx';
import { Icon } from './Icon';
import { Avatar } from './Avatar';
import { Spinner } from './Spinner';
import { useToastStore } from '@/store/useToastStore';
import { useBonds, useSharePostToBond } from '@/hooks/useBonds';
import styles from './SaveToBondModal.module.css';

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
    <div className={styles.overlay} onClick={onClose}>
      <div className={clsx('rise', styles.modal)} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={clsx('serif', styles.title)}>Save to a Bond</h3>
          <button onClick={onClose} className={styles.closeBtn}>
            <Icon name="close" size={16} stroke="var(--ink-3)"/>
          </button>
        </div>
        <div className={styles.body}>
          {isLoading ? (
            <div className={styles.loadingWrap}><Spinner/></div>
          ) : connections.length === 0 ? (
            <p className={styles.emptyText}>
              You don&apos;t have anyone in your circle yet.
            </p>
          ) : (
            connections.map(b => {
              const sent = sentTo === b.id;
              const firstName = b.otherUser?.displayName?.split(' ')[0] ?? 'them';
              return (
                <button key={b.id} onClick={() => send(b.id, firstName)}
                  disabled={share.isPending}
                  className={styles.connectionRow}>
                  <Avatar name={b.otherUser?.displayName ?? ''} size={38} avatarUrl={b.otherUser?.avatarUrl} aura={b.otherUser?.aura ?? undefined}/>
                  <span className={styles.connectionName}>{b.otherUser?.displayName ?? 'Someone'}</span>
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

