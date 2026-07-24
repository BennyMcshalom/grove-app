'use client';
import { useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { useToastStore } from '@/store/useToastStore';
import { useBonds } from '@/hooks/useBonds';
import { useInviteToGroup } from '@/hooks/useGroups';
import type { GroupMember } from '@/lib/api';

export function InvitePicker({ groupId, members, onClose }: { groupId: string; members: GroupMember[]; onClose: () => void }) {
  const { toast } = useToastStore();
  const { data: bonds, isLoading } = useBonds();
  const invite = useInviteToGroup(groupId);
  const [invited, setInvited] = useState<string[]>([]);

  const memberIds = new Set(members.map(m => m.userId));
  const candidates = (bonds ?? []).filter(b => b.otherUser?.id && !memberIds.has(b.otherUser.id));

  return (
    <div className="fade-in card" style={{ marginTop: '.7rem', padding: '.9rem 1rem', background: 'var(--surf-low)', boxShadow: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.6rem' }}>
        <div className="label-mono">Invite a connection</div>
        <button onClick={onClose} style={{ color: 'var(--ink-4)' }}><Icon name="close" size={14} stroke="var(--ink-4)"/></button>
      </div>
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}><Spinner size={16}/></div>
      ) : candidates.length === 0 ? (
        <p style={{ fontSize: '.82rem', color: 'var(--ink-4)', fontStyle: 'italic', margin: 0 }}>
          {bonds && bonds.length > 0 ? "Everyone you're connected to is already here." : 'Form a Bond or Circle connection first, then you can bring them in.'}
        </p>
      ) : (
        <div className="scroll" style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '.15rem' }}>
          {candidates.map(b => {
            const id = b.otherUser!.id;
            const name = b.otherUser?.displayName ?? 'Connection';
            const done = invited.includes(id);
            return (
              <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '.6rem', padding: '.35rem 0' }}>
                <Avatar name={name} size={30} avatarUrl={b.otherUser?.avatarUrl} aura={b.otherUser?.aura ?? undefined}/>
                <span style={{ flex: 1, minWidth: 0, fontSize: '.86rem', fontWeight: 500 }}>{name}</span>
                <button disabled={done || invite.isPending}
                  onClick={async () => {
                    try { await invite.mutateAsync(id); setInvited(v => [...v, id]); toast(`Invited ${name.split(' ')[0]}.`); }
                    catch { toast('Could not invite.'); }
                  }}
                  className="btn btn-ghost" style={{ padding: '.32rem .75rem', fontSize: '.78rem', flexShrink: 0 }}>
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
