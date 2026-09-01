'use client';
import clsx from 'clsx';
import { useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { useToastStore } from '@/store/useToastStore';
import { useBonds } from '@/hooks/useBonds';
import { useInviteToGroup } from '@/hooks/useGroups';
import type { GroupMember } from '@/lib/api';
import styles from './InvitePicker.module.css';

export function InvitePicker({ groupId, members, onClose }: { groupId: string; members: GroupMember[]; onClose: () => void }) {
  const { toast } = useToastStore();
  const { data: bonds, isLoading } = useBonds();
  const invite = useInviteToGroup(groupId);
  const [invited, setInvited] = useState<string[]>([]);

  const memberIds = new Set(members.map(m => m.userId));
  const candidates = (bonds ?? []).filter(b => b.otherUser?.id && !memberIds.has(b.otherUser.id));

  return (
    <div className={clsx('fade-in', 'card', styles.wrap)}>
      <div className={styles.header}>
        <div className="label-mono">Invite a connection</div>
        <button onClick={onClose} className={styles.closeBtn}><Icon name="close" size={14} stroke="var(--ink-4)"/></button>
      </div>
      {isLoading ? (
        <div className={styles.loadingWrap}><Spinner size={16}/></div>
      ) : candidates.length === 0 ? (
        <p className={styles.emptyText}>
          {bonds && bonds.length > 0 ? "Everyone you're connected to is already here." : 'Form a Bond or Circle connection first, then you can bring them in.'}
        </p>
      ) : (
        <div className={clsx('scroll', styles.list)}>
          {candidates.map(b => {
            const id = b.otherUser!.id;
            const name = b.otherUser?.displayName ?? 'Connection';
            const done = invited.includes(id);
            return (
              <div key={b.id} className={styles.row}>
                <Avatar name={name} size={30} avatarUrl={b.otherUser?.avatarUrl} aura={b.otherUser?.aura ?? undefined}/>
                <span className={styles.name}>{name}</span>
                <button disabled={done || invite.isPending}
                  onClick={async () => {
                    try { await invite.mutateAsync(id); setInvited(v => [...v, id]); toast(`Invited ${name.split(' ')[0]}.`); }
                    catch { toast('Could not invite.'); }
                  }}
                  className={clsx('btn', 'btn-ghost', styles.inviteBtn)}>
                  {done ? 'Invited' : 'Invite'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
